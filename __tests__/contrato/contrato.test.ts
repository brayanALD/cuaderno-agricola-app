import { ErrorApi } from '@/api/errores';
import { insertarLabor } from '@/repositories/laborRepository';
import { insertarLote } from '@/repositories/loteRepository';
import { cerrarCiclo } from '@/services/cicloService';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { sincronizar, type ClienteSync } from '@/services/sincronizacionService';
import {
  cicloRemotoSchema,
  laborRemotaSchema,
  loteRemotoSchema,
} from '@/services/sync/esquemasRemotos';
import { leerContrato } from '../helpers/contrato';
import { crearDispositivo } from '../helpers/dispositivo';
import { AHORA, laborFila, loteFila } from '../helpers/filas';
import { crearServidorFalso } from '../helpers/servidorFalso';
import { montar, nuevoFetch } from '../helpers/cliente';

/**
 * Prueba de contrato (D103): la app cumple lo que dice `contrato/contrato.json`, copia idéntica de la que
 * mantiene la API (su CI comprueba que no se haya quedado atrás). Si la API cambia el contrato, esto falla hasta
 * que la app se ajuste.
 */
const contrato = leerContrato();
const { lotes, labores, ciclos } = contrato.recursos;

/** Lo que `crearLabor` pide: el ejemplo sin lo que pone la app (lote) ni la foto, que sube por otro camino. */
const datosDeLaborEjemplo = () => {
  const { lote_id: _lote, foto_url: _foto, ...resto } = labores.ejemplo;
  return resto;
};

const clavesDe = (objeto: unknown): string[] =>
  Object.keys(objeto as Record<string, unknown>).sort();

async function conEjemplosSincronizados() {
  const servidor = crearServidorFalso();
  const { ctx, avanzar } = await crearDispositivo('a');
  const lote = await crearLote(ctx, lotes.ejemplo);
  const loteId = lote.ok ? lote.valor.id : '';
  await crearLabor(ctx, loteId, datosDeLaborEjemplo());
  await sincronizar(ctx, servidor);
  avanzar();
  await cerrarCiclo(ctx, loteId, {
    fecha_fin: '2026-10-31',
    cultivo: 'Maíz',
    fecha_siembra: '2026-11-01',
  });
  await sincronizar(ctx, servidor);
  return { servidor, ctx, loteId };
}

describe('lo que la app ENVÍA cumple el contrato', () => {
  it('un lote y una labor viajan con exactamente los campos del contrato y su versión base', async () => {
    const { servidor, loteId } = await conEjemplosSincronizados();

    const putLote = servidor.llamadasA('PUT').find((l) => l.ruta.startsWith('/api/lotes/'));
    const putLabor = servidor.llamadasA('PUT').find((l) => l.ruta.startsWith('/api/labores/'));

    expect(clavesDe(putLote?.cuerpo)).toEqual(
      [...lotes.campos, contrato.version_base.campo].sort(),
    );
    expect(putLote?.cuerpo).toEqual({ ...lotes.ejemplo, [contrato.version_base.campo]: null });
    expect(clavesDe(putLabor?.cuerpo)).toEqual(
      [...labores.campos, contrato.version_base.campo].sort(),
    );
    expect(putLabor?.cuerpo).toEqual({
      ...labores.ejemplo,
      lote_id: loteId,
      foto_url: null,
      [contrato.version_base.campo]: null,
    });
  });

  it('un ciclo cerrado viaja con los campos del contrato y SIN versión base (no se edita)', async () => {
    const { servidor } = await conEjemplosSincronizados();

    const putCiclo = servidor.llamadasA('PUT').find((l) => l.ruta.startsWith('/api/ciclos/'));

    expect(clavesDe(putCiclo?.cuerpo)).toEqual([...ciclos.campos].sort());
    expect(contrato.version_base.recursos).not.toContain('ciclos');
  });

  it('usa la ruta de envío por lotes y respeta su límite', async () => {
    const servidor = crearServidorFalso();
    const { ctx } = await crearDispositivo('a');
    const lote = await crearLote(ctx, lotes.ejemplo);
    const loteId = lote.ok ? lote.valor.id : '';
    for (let i = 0; i <= contrato.cambios.limite; i += 1) {
      await crearLabor(ctx, loteId, { ...datosDeLaborEjemplo(), cantidad: i });
    }

    await sincronizar(ctx, servidor);

    const viajes = servidor
      .llamadasA('POST')
      .filter((l) => l.ruta === contrato.cambios.ruta)
      .map((l) => (l.cuerpo as { cambios: unknown[] }).cambios.length);
    expect(viajes).toEqual([1, contrato.cambios.limite, 1]);
  });
});

describe('lo que la app RECIBE cumple el contrato', () => {
  it.each([
    ['lotes', loteRemotoSchema, lotes],
    ['labores', laborRemotaSchema, labores],
    ['ciclos', cicloRemotoSchema, ciclos],
  ] as const)(
    'acepta el documento de %s y conserva todos sus campos',
    (_nombre, esquema, recurso) => {
      const analisis = esquema.safeParse(recurso.documento);

      expect(analisis.success).toBe(true);
      expect(clavesDe(analisis.data)).toEqual(clavesDe(recurso.documento));
    },
  );

  it.each([
    ['lotes', loteRemotoSchema, lotes],
    ['labores', laborRemotaSchema, labores],
  ] as const)(
    'acepta un documento de %s de un teléfono o servidor ANTIGUO, sin los campos opcionales',
    (_nombre, esquema, recurso) => {
      const antiguo = Object.fromEntries(
        Object.entries(recurso.documento).filter(([campo]) => !recurso.opcionales.includes(campo)),
      );

      const analisis = esquema.safeParse(antiguo);

      expect(analisis.success).toBe(true);
      for (const campo of recurso.opcionales) {
        expect((analisis.data as Record<string, unknown>)[campo]).toBeNull();
      }
    },
  );

  it('entiende la respuesta del envío por lotes: lo aceptado queda enviado, lo rechazado con su motivo, y un borrado 404 cuenta como hecho', async () => {
    const { ctx } = await crearDispositivo('a');
    await insertarLote(ctx.db, loteFila({ id: 'lote-1' }));
    await insertarLabor(ctx.db, laborFila({ id: 'labor-1', lote_id: 'lote-1' }));
    await insertarLabor(
      ctx.db,
      laborFila({ id: 'labor-0', lote_id: 'lote-1', deleted_at: AHORA, updated_at: AHORA }),
    );
    const cambiosVistos: Record<string, unknown>[] = [];
    const cliente: ClienteSync = {
      pedir: (ruta, peticion) => {
        if (ruta !== contrato.cambios.ruta)
          return Promise.resolve({ items: [], servidor_ahora: AHORA });
        const { cambios } = peticion?.cuerpo as { cambios: Record<string, unknown>[] };
        cambiosVistos.push(...cambios);
        const resultados = cambios.map((c) =>
          contrato.cambios.respuesta.resultados.find(
            (r) => r.recurso === c.recurso && r.id === c.id,
          ),
        );
        return Promise.resolve({ resultados });
      },
    };

    const resultado = await sincronizar(ctx, cliente);

    expect(resultado.ok).toBe(true);
    expect(
      await ctx.db.getAllAsync('SELECT id, pending, sync_error, version_servidor FROM lote'),
    ).toEqual([
      { id: 'lote-1', pending: 0, sync_error: null, version_servidor: '2026-11-15T10:00:00.000Z' },
    ]);
    expect(
      await ctx.db.getAllAsync('SELECT id, pending, sync_error FROM labor ORDER BY id'),
    ).toEqual([
      { id: 'labor-0', pending: 0, sync_error: null },
      {
        id: 'labor-1',
        pending: 1,
        sync_error: 'El servidor la rechazó: La cantidad no puede ser negativa.',
      },
    ]);
    // Y los cambios que la app mandó tienen la forma del contrato.
    for (const cambio of cambiosVistos) {
      expect(
        Object.keys(cambio).every((c) => ['recurso', 'id', 'borrado', 'cuerpo'].includes(c)),
      ).toBe(true);
    }
    expect(cambiosVistos.find((c) => c.id === 'labor-0')).toEqual({
      recurso: 'labores',
      id: 'labor-0',
      borrado: true,
    });
  });

  it('entiende el formato de error de la API, con sus detalles por campo', async () => {
    const { ejemplo } = contrato.error;
    const fetchImpl = nuevoFetch().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve(ejemplo),
    });
    const { cliente } = montar(fetchImpl);

    const error = await cliente.iniciarSesion('ana@correo.com', 'x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({
      status: 400,
      message: ejemplo.error,
      detalles: ejemplo.detalles,
    });
  });
});

describe('las validaciones de la app coinciden con las del contrato', () => {
  it.each(
    lotes.invalidos.filter((i) => i.alcance.includes('app')).map((i) => [i.motivo, i] as const),
  )('un lote con %s se rechaza en el campo que dice el contrato', async (_motivo, caso) => {
    const { ctx } = await crearDispositivo('a');

    const resultado = await crearLote(ctx, { ...lotes.ejemplo, ...caso.cambios });

    expect(!resultado.ok && Object.keys(resultado.errores)).toContain(caso.campo);
  });

  it.each(
    labores.invalidos.filter((i) => i.alcance.includes('app')).map((i) => [i.motivo, i] as const),
  )('una labor con %s se rechaza en el campo que dice el contrato', async (_motivo, caso) => {
    const { ctx } = await crearDispositivo('a');
    const lote = await crearLote(ctx, lotes.ejemplo);

    const resultado = await crearLabor(ctx, lote.ok ? lote.valor.id : '', {
      ...datosDeLaborEjemplo(),
      ...caso.cambios,
    });

    expect(!resultado.ok && Object.keys(resultado.errores)).toContain(caso.campo);
  });

  it('el ejemplo válido SÍ lo aceptan la app y el servidor falso de las pruebas', async () => {
    const { ctx } = await crearDispositivo('a');
    const servidor = crearServidorFalso();

    expect((await crearLote(ctx, lotes.ejemplo)).ok).toBe(true);
    expect(servidor.guardar('lotes', 'x', lotes.ejemplo).id).toBe('x');
  });
});
