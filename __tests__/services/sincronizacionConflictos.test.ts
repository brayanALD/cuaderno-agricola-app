import { ErrorDeRed } from '@/api/errores';
import { crearLabor, actualizarLabor, listarLaboresDeLote } from '@/services/laborService';
import { resolverConflicto } from '@/services/conflictoService';
import { actualizarLote, borrarLote, crearLote, obtenerLote } from '@/services/loteService';
import { sincronizar } from '@/services/sincronizacionService';
import { MENSAJE_CONFLICTO } from '@/services/sync/errores';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo, type Dispositivo } from '../helpers/dispositivo';
import { crearServidorFalso, type ServidorFalso } from '../helpers/servidorFalso';

/** Estado de la fila que importa para los conflictos. */
const filaDe = (d: Dispositivo, tabla: 'lote' | 'labor') =>
  d.ctx.db.getFirstAsync(
    `SELECT pending, sync_error, conflicto IS NOT NULL AS conflicto, deleted_at IS NOT NULL AS borrada
     FROM ${tabla}`,
  );

/** Dos teléfonos con el mismo lote `a-1` (y la labor `a-2`) ya sincronizados. */
async function dosTelefonos() {
  const servidor = crearServidorFalso();
  const a = await crearDispositivo('a');
  const b = await crearDispositivo('b');
  await crearLote(a.ctx, datosLote());
  await crearLabor(a.ctx, 'a-1', datosLabor());
  await sincronizar(a.ctx, servidor);
  await sincronizar(b.ctx, servidor);
  return { servidor, a, b };
}

async function editaLote(d: Dispositivo, servidor: ServidorFalso | null, nombre: string) {
  d.avanzar();
  await actualizarLote(d.ctx, 'a-1', datosLote({ nombre }));
  if (servidor !== null) await sincronizar(d.ctx, servidor);
}

/** B edita y sincroniza; A edita SIN conexión y luego sincroniza: el choque clásico. */
async function choqueDeLote() {
  const m = await dosTelefonos();
  await editaLote(m.b, m.servidor, 'De B');
  await editaLote(m.a, null, 'De A');
  const resultado = await sincronizar(m.a.ctx, m.servidor);
  return { ...m, resultado };
}

describe('conflictos entre dos teléfonos (D96)', () => {
  it('lo editado en los dos teléfonos NO se pisa: queda en conflicto y espera la elección', async () => {
    const { servidor, a, resultado } = await choqueDeLote();

    expect(resultado.ok && resultado.resumen.conAviso).toBeGreaterThanOrEqual(1);
    expect(servidor.lotes.get('a-1')?.nombre).toBe('De B');
    expect(await obtenerLote(a.ctx, 'a-1')).toMatchObject({
      nombre: 'De A',
      sync_error: MENSAJE_CONFLICTO,
    });
    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 1, conflicto: 1 });
  });

  it('mientras no elige, no se vuelve a enviar nada de esa fila', async () => {
    const { servidor, a } = await choqueDeLote();
    servidor.llamadas.length = 0;

    await sincronizar(a.ctx, servidor);

    expect(servidor.llamadasA('PUT')).toEqual([]);
    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 1, conflicto: 1 });
  });

  it('«quedarme con la mía» la envía en la próxima vuelta y el otro teléfono la recibe', async () => {
    const { servidor, a, b } = await choqueDeLote();

    expect(await resolverConflicto(a.ctx, 'lote', 'a-1', 'mia')).toBe(true);
    await sincronizar(a.ctx, servidor);
    await sincronizar(b.ctx, servidor);

    expect(servidor.lotes.get('a-1')?.nombre).toBe('De A');
    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 0, sync_error: null, conflicto: 0 });
    expect((await obtenerLote(b.ctx, 'a-1'))?.nombre).toBe('De A');
  });

  it('«usar la del otro dispositivo» descarta lo local y queda sincronizado', async () => {
    const { servidor, a } = await choqueDeLote();

    expect(await resolverConflicto(a.ctx, 'lote', 'a-1', 'servidor')).toBe(true);

    expect(await obtenerLote(a.ctx, 'a-1')).toMatchObject({ nombre: 'De B', pending: 0 });
    expect(await filaDe(a, 'lote')).toMatchObject({ sync_error: null, conflicto: 0 });
    expect(servidor.lotes.get('a-1')?.nombre).toBe('De B');
  });

  it('si ya no hay nada que decidir, resolver devuelve false y no toca nada', async () => {
    const { a } = await dosTelefonos();

    expect(await resolverConflicto(a.ctx, 'lote', 'a-1', 'mia')).toBe(false);
    expect(await resolverConflicto(a.ctx, 'labor', 'a-2', 'servidor')).toBe(false);
  });

  it('editar una fila en conflicto no hace desaparecer el aviso: lo quita elegir', async () => {
    const { a } = await choqueDeLote();

    await editaLote(a, null, 'De A otra vez');

    expect(await obtenerLote(a.ctx, 'a-1')).toMatchObject({
      nombre: 'De A otra vez',
      sync_error: MENSAJE_CONFLICTO,
    });
    expect(await filaDe(a, 'lote')).toMatchObject({ conflicto: 1 });
  });

  it('si lo borraron en el otro teléfono mientras aquí se editaba, también es un conflicto', async () => {
    const { servidor, a, b } = await dosTelefonos();
    b.avanzar();
    await borrarLote(b.ctx, 'a-1');
    await sincronizar(b.ctx, servidor);
    await editaLote(a, null, 'De A');

    await sincronizar(a.ctx, servidor);

    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 1, conflicto: 1 });
    await resolverConflicto(a.ctx, 'lote', 'a-1', 'servidor');
    expect(await obtenerLote(a.ctx, 'a-1')).toBeNull();
  });

  it('un lote borrado en el otro teléfono se puede «resucitar» quedándose con el propio', async () => {
    const { servidor, a, b } = await dosTelefonos();
    b.avanzar();
    await borrarLote(b.ctx, 'a-1');
    await sincronizar(b.ctx, servidor);
    await editaLote(a, null, 'De A');
    await sincronizar(a.ctx, servidor);

    await resolverConflicto(a.ctx, 'lote', 'a-1', 'mia');
    await sincronizar(a.ctx, servidor);

    expect(servidor.lotes.get('a-1')).toMatchObject({ nombre: 'De A', deleted_at: null });
  });
});

describe('lo que NO es un conflicto', () => {
  it('un teléfono que edita varias veces seguidas parte siempre de la versión que dejó el servidor', async () => {
    const { servidor, a } = await dosTelefonos();

    await editaLote(a, servidor, 'Uno');
    await editaLote(a, servidor, 'Dos');
    await editaLote(a, servidor, 'Tres');

    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 0, sync_error: null, conflicto: 0 });
    expect(servidor.lotes.get('a-1')?.nombre).toBe('Tres');
  });

  it('dos teléfonos que dejan EL MISMO contenido no chocan', async () => {
    const { servidor, a, b } = await dosTelefonos();
    await editaLote(b, servidor, 'Igual');
    await editaLote(a, null, 'Igual');

    await sincronizar(a.ctx, servidor);

    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 0, sync_error: null, conflicto: 0 });
  });

  it('un teléfono que edita lo que el otro no tocó ni lo avisa ni lo bloquea', async () => {
    const { servidor, a, b } = await dosTelefonos();
    await editaLote(b, servidor, 'De B');
    await sincronizar(a.ctx, servidor);

    await editaLote(a, servidor, 'De A después de recibir');

    expect(servidor.lotes.get('a-1')?.nombre).toBe('De A después de recibir');
    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 0, conflicto: 0 });
  });

  it('una respuesta perdida (el servidor sí guardó) se reintenta sin falso conflicto', async () => {
    const servidor = crearServidorFalso();
    const a = await crearDispositivo('a');
    await crearLote(a.ctx, datosLote());
    servidor.estado.alResponder = () => {
      servidor.estado.alResponder = null;
      throw new ErrorDeRed('Se cortó justo al responder');
    };

    const primera = await sincronizar(a.ctx, servidor);
    const segunda = await sincronizar(a.ctx, servidor);

    expect(primera.ok).toBe(false);
    expect(segunda.ok).toBe(true);
    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 0, sync_error: null, conflicto: 0 });
  });

  it('una fila anterior a esta versión (versión desconocida) sigue con «gana la última escritura»', async () => {
    const { servidor, a, b } = await dosTelefonos();
    await editaLote(b, servidor, 'De B');
    await a.ctx.db.execAsync("UPDATE lote SET version_servidor = ''");
    await editaLote(a, null, 'De A');
    servidor.llamadas.length = 0;

    await sincronizar(a.ctx, servidor);

    const [envio] = servidor.llamadasA('PUT');
    expect(Object.keys(envio?.cuerpo as object)).not.toContain('base_updated_at');
    expect(servidor.lotes.get('a-1')?.nombre).toBe('De A');
    expect(await filaDe(a, 'lote')).toMatchObject({ pending: 0, conflicto: 0 });
  });
});

describe('conflictos en labores', () => {
  async function choqueDeLabor() {
    const m = await dosTelefonos();
    m.b.avanzar();
    await actualizarLabor(m.b.ctx, 'a-2', datosLabor({ cantidad: 111 }));
    await sincronizar(m.b.ctx, m.servidor);
    m.a.avanzar();
    await actualizarLabor(m.a.ctx, 'a-2', datosLabor({ cantidad: 222 }));
    await sincronizar(m.a.ctx, m.servidor);
    return m;
  }

  it('una labor editada en los dos teléfonos queda en conflicto', async () => {
    const { servidor, a } = await choqueDeLabor();

    expect(servidor.labores.get('a-2')?.cantidad).toBe(111);
    expect(await filaDe(a, 'labor')).toMatchObject({ pending: 1, conflicto: 1 });
    expect((await listarLaboresDeLote(a.ctx, 'a-1'))[0]).toMatchObject({
      cantidad: 222,
      sync_error: MENSAJE_CONFLICTO,
    });
  });

  it('«quedarme con la mía» la envía; «usar la del otro» la reemplaza', async () => {
    const { servidor, a } = await choqueDeLabor();

    await resolverConflicto(a.ctx, 'labor', 'a-2', 'mia');
    await sincronizar(a.ctx, servidor);

    expect(servidor.labores.get('a-2')?.cantidad).toBe(222);
    expect(await filaDe(a, 'labor')).toMatchObject({ pending: 0, conflicto: 0 });
  });

  it('elegir la del otro dispositivo deja la labor como está en el servidor', async () => {
    const { a } = await choqueDeLabor();

    await resolverConflicto(a.ctx, 'labor', 'a-2', 'servidor');

    expect((await listarLaboresDeLote(a.ctx, 'a-1'))[0]).toMatchObject({
      cantidad: 111,
      pending: 0,
      sync_error: null,
    });
  });

  it.each(['{no es json', '{"id":"a-2"}'])(
    'un documento de conflicto ilegible (%s) no deja la fila atascada: se desbloquea',
    async (ilegible) => {
      const { servidor, a } = await choqueDeLabor();
      await a.ctx.db.runAsync('UPDATE labor SET conflicto = ?', [ilegible]);

      expect(await resolverConflicto(a.ctx, 'labor', 'a-2', 'servidor')).toBe(true);
      await sincronizar(a.ctx, servidor);

      expect(await filaDe(a, 'labor')).toMatchObject({ pending: 0, conflicto: 0 });
    },
  );
});
