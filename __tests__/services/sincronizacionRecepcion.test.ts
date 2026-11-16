import { leerEstadoSync } from '@/repositories/estadoSyncRepository';
import { obtenerLote as leerLote } from '@/repositories/loteRepository';
import { listarLaboresDeLote } from '@/services/laborService';
import { actualizarLote, crearLote, listarLotesConDias } from '@/services/loteService';
import { sincronizar } from '@/services/sincronizacionService';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearServidorFalso, TAMANO_PAGINA } from '../helpers/servidorFalso';

const loteRemoto = (id: string, nombre: string, cambios = {}) => ({
  id,
  ...datosLote({ nombre }),
  ...cambios,
});
const laborRemota = (id: string, loteId: string, cambios = {}) => ({
  id,
  lote_id: loteId,
  tipo: 'riego',
  fecha: '2026-11-10',
  cantidad: 20,
  unidad: 'L',
  nota: null,
  foto_url: null,
  luz: null,
  ...cambios,
});

describe('sincronizar: recibir lo del servidor', () => {
  it('un teléfono nuevo recibe los lotes y labores de la cuenta, ya sincronizados', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('l1', 'El Mirador'));
    servidor.sembrar('labores', laborRemota('b1', 'l1', { cantidad: 12.5 }));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen).toEqual({
      enviados: 0,
      recibidos: 2,
      descartados: 0,
      conAviso: 0,
    });
    expect(await leerLote(ctx.db, 'l1')).toEqual(
      expect.objectContaining({ nombre: 'El Mirador', pending: 0, sync_error: null }),
    );
    expect(await listarLaboresDeLote(ctx, 'l1')).toEqual([
      expect.objectContaining({ id: 'b1', cantidad: 12.5, pending: 0 }),
    ]);
  });

  it('guarda el cursor (el `servidor_ahora` de la PRIMERA petición) y la próxima vuelta pide desde ahí', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('l1', 'El Mirador'));

    await sincronizar(ctx, servidor);
    const cursor = await leerEstadoSync(ctx.db, 'since_lotes');
    expect(cursor).toMatch(/^2026-11-15T10:00:\d\d\.000Z$/);
    expect(await leerEstadoSync(ctx.db, 'ultima_sync')).toBe(ctx.ahora());
    servidor.llamadas.length = 0;
    await sincronizar(ctx, servidor);

    expect(servidor.llamadasA('GET').map((l) => l.ruta)).toEqual([
      `/api/lotes?since=${encodeURIComponent(cursor ?? '')}`,
      expect.stringContaining('/api/ciclos?since='),
      expect.stringContaining('/api/labores?since='),
    ]);
  });

  it('la primera vez pide sin `since`', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();

    await sincronizar(ctx, servidor);

    expect(servidor.llamadasA('GET').map((l) => l.ruta)).toEqual([
      '/api/lotes',
      '/api/ciclos',
      '/api/labores',
    ]);
  });

  it('pide otra página mientras la anterior llegue llena (500), desde el último `updated_at` (inclusivo)', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    for (let n = 1; n <= TAMANO_PAGINA + 1; n++)
      servidor.sembrar('lotes', loteRemoto(`l${n}`, `Lote ${n}`));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.recibidos).toBe(TAMANO_PAGINA + 1);
    expect(await ctx.db.getFirstAsync('SELECT COUNT(*) AS n FROM lote')).toEqual({
      n: TAMANO_PAGINA + 1,
    });
    const pedidos = servidor.llamadasA('GET').map((l) => l.ruta);
    expect(pedidos.filter((ruta) => ruta.startsWith('/api/lotes'))).toHaveLength(2);
    expect(pedidos[1]).toContain('?since=');
  });

  it('no se queda en bucle si una página llena no avanza (todos con el mismo updated_at)', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    for (let n = 1; n <= TAMANO_PAGINA + 1; n++) {
      servidor.sembrar(
        'lotes',
        loteRemoto(`l${n}`, `Lote ${n}`, { updated_at: '2026-11-15T09:00:00.000Z' }),
      );
    }

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok).toBe(true);
    const pedidos = servidor.llamadasA('GET').filter((l) => l.ruta.startsWith('/api/lotes'));
    expect(pedidos.length).toBeLessThanOrEqual(2);
  });

  it('un cambio hecho en otro teléfono se aplica sobre lo ya sincronizado', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await sincronizar(ctx, servidor);

    servidor.guardar('lotes', 'a-1', datosLote({ nombre: 'Renombrado en el otro', area_m2: 9000 }));
    await sincronizar(ctx, servidor);

    expect(await leerLote(ctx.db, 'a-1')).toEqual(
      expect.objectContaining({ nombre: 'Renombrado en el otro', area_m2: 9000, pending: 0 }),
    );
  });

  it('un borrado hecho en otro teléfono hace desaparecer el lote', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await sincronizar(ctx, servidor);

    servidor.borrar('lotes', 'a-1');
    await sincronizar(ctx, servidor);

    expect(await leerLote(ctx.db, 'a-1')).toBeNull();
    expect(await listarLotesConDias(ctx)).toEqual([]);
  });

  it('un lote borrado en el servidor que este teléfono nunca tuvo no se guarda', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar(
      'lotes',
      loteRemoto('viejo', 'Viejo', { deleted_at: '2026-11-01T00:00:00.000Z' }),
    );

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.recibidos).toBe(0);
    expect(await ctx.db.getAllAsync('SELECT id FROM lote')).toEqual([]);
  });
});

describe('sincronizar: conflictos al recibir (gana lo pendiente de este teléfono)', () => {
  it('un cambio local hecho MIENTRAS se descarga no se pisa y sale en la próxima vuelta', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await sincronizar(ctx, servidor);
    servidor.guardar('lotes', 'a-1', datosLote({ nombre: 'Del otro teléfono' }));
    servidor.estado.alResponder = async (metodo, ruta) => {
      if (metodo !== 'GET' || !ruta.startsWith('/api/lotes')) return;
      avanzar();
      await actualizarLote(ctx, 'a-1', datosLote({ nombre: 'Mi cambio local' }));
      servidor.estado.alResponder = null;
    };

    await sincronizar(ctx, servidor);
    expect(await leerLote(ctx.db, 'a-1')).toEqual(
      expect.objectContaining({ nombre: 'Mi cambio local', pending: 1 }),
    );

    avanzar();
    await sincronizar(ctx, servidor);
    expect(servidor.lotes.get('a-1')?.nombre).toBe('Mi cambio local');
  });

  it('si el lote que llega tiene el nombre de uno local pendiente, ese queda con aviso y el del servidor entra', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('del-servidor', 'El Mirador'));
    servidor.estado.alResponder = async (metodo, ruta) => {
      if (metodo !== 'GET' || !ruta.startsWith('/api/lotes')) return;
      await crearLote(ctx, datosLote({ nombre: 'el mirador' }));
      servidor.estado.alResponder = null;
    };

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.conAviso).toBe(1);
    expect(await leerLote(ctx.db, 'del-servidor')).toEqual(expect.objectContaining({ pending: 0 }));
    expect(await leerLote(ctx.db, 'a-1')).toEqual(
      expect.objectContaining({
        pending: 1,
        sync_error: expect.stringContaining('Ya existe otro lote'),
      }),
    );
  });

  it('si el nombre choca con un lote ya sincronizado, el que llega se descarta y se cuenta', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('a', 'El Mirador'));
    await sincronizar(ctx, servidor);
    servidor.sembrar('lotes', loteRemoto('b', 'EL MIRADOR'));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.descartados).toBe(1);
    expect(await leerLote(ctx.db, 'b')).toBeNull();
  });

  it('un elemento inválido del servidor se descarta y se cuenta, y los demás se aplican', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('malo', 'Roto', { area_m2: 0 }));
    servidor.sembrar('lotes', loteRemoto('bueno', 'Sano'));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen).toEqual(
      expect.objectContaining({ recibidos: 1, descartados: 1 }),
    );
    expect(await leerLote(ctx.db, 'bueno')).not.toBeNull();
    expect(await leerLote(ctx.db, 'malo')).toBeNull();
  });

  it('una labor cuyo lote este teléfono no tiene no se guarda y el cursor de labores NO avanza (se reintenta)', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('labores', laborRemota('huerfana', 'lote-que-no-llega'));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok).toBe(true);
    expect(await ctx.db.getAllAsync('SELECT id FROM labor')).toEqual([]);
    expect(await leerEstadoSync(ctx.db, 'since_labores')).toBeNull();
    expect(await leerEstadoSync(ctx.db, 'since_lotes')).not.toBeNull();

    servidor.sembrar('lotes', loteRemoto('lote-que-no-llega', 'Ya llegó'));
    await sincronizar(ctx, servidor);

    expect(await ctx.db.getAllAsync('SELECT id FROM labor')).toEqual([{ id: 'huerfana' }]);
    expect(await leerEstadoSync(ctx.db, 'since_labores')).not.toBeNull();
  });

  it('una labor inválida del servidor se descarta y se cuenta', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('l1', 'El Mirador'));
    servidor.sembrar('labores', laborRemota('mala', 'l1', { tipo: 'volar' }));
    servidor.sembrar('labores', laborRemota('buena', 'l1'));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen).toEqual(
      expect.objectContaining({ recibidos: 2, descartados: 1 }),
    );
  });

  it('un borrado remoto de una labor ya sincronizada la quita de la lista', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('l1', 'El Mirador'));
    servidor.sembrar('labores', laborRemota('b1', 'l1'));
    await sincronizar(ctx, servidor);

    servidor.borrar('labores', 'b1');
    await sincronizar(ctx, servidor);

    expect(await listarLaboresDeLote(ctx, 'l1')).toEqual([]);
  });

  it('las labores de datosLabor llegan íntegras de otro teléfono', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', loteRemoto('l1', 'El Mirador'));
    servidor.guardar('labores', 'b1', {
      lote_id: 'l1',
      ...datosLabor({ nota: 'Con nota' }),
      foto_url: null,
    });

    await sincronizar(ctx, servidor);

    expect(await listarLaboresDeLote(ctx, 'l1')).toEqual([
      expect.objectContaining({ nota: 'Con nota', tipo: 'riego' }),
    ]);
  });
});
