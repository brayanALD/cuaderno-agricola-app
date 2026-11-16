import { ErrorDeRed } from '@/api/errores';
import { borrarLote, crearLote } from '@/services/loteService';
import { crearLabor } from '@/services/laborService';
import { sincronizar } from '@/services/sincronizacionService';
import { MENSAJE_NOMBRE_REPETIDO } from '@/services/sync/errores';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearServidorFalso, type ServidorFalso } from '../helpers/servidorFalso';

/** Los envíos por lotes (`POST /api/sync`) que recibió el servidor, con cuántos cambios llevaba cada uno. */
const viajes = (servidor: ServidorFalso): number[] =>
  servidor
    .llamadasA('POST')
    .filter((l) => l.ruta === '/api/sync')
    .map((l) => (l.cuerpo as { cambios: unknown[] }).cambios.length);

describe('envío por lotes: POST /api/sync (D98)', () => {
  it('lotes y labores viajan juntos en pocos viajes (uno por tipo), no uno por fila', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());
    await crearLabor(ctx, 'a-1', datosLabor({ cantidad: 5 }));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.enviados).toBe(3);
    expect(viajes(servidor)).toEqual([1, 2]);
    expect(servidor.llamadas.filter((l) => l.ruta.startsWith('/api/labores/'))).toHaveLength(2);
  });

  it('más de 50 cambios se parten en varios viajes de máximo 50', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    for (let i = 0; i < 60; i += 1) await crearLabor(ctx, 'a-1', datosLabor({ cantidad: i }));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.enviados).toBe(61);
    expect(viajes(servidor)).toEqual([1, 50, 10]);
    expect(servidor.labores.size).toBe(60);
  });

  it('los borrados viajan marcados como borrado y se dan por hechos', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await sincronizar(ctx, servidor);
    avanzar();
    servidor.llamadas.length = 0;

    await borrarLote(ctx, 'a-1');
    await sincronizar(ctx, servidor);

    const [viaje] = servidor.llamadasA('POST');
    expect(viaje?.cuerpo).toEqual({
      cambios: [{ recurso: 'lotes', id: 'a-1', borrado: true }],
    });
    expect(servidor.lotes.get('a-1')?.deleted_at).not.toBeNull();
  });

  it('un cambio rechazado queda con su aviso y NO detiene a los demás del mismo viaje', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.guardar('lotes', 'otro-telefono', datosLote({ nombre: 'Repetido' }));
    await crearLote(ctx, datosLote({ nombre: 'Repetido' }));
    await crearLote(ctx, datosLote({ nombre: 'Sin problema' }));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen).toMatchObject({ enviados: 1, conAviso: 1 });
    expect(
      await ctx.db.getAllAsync(
        "SELECT nombre, sync_error FROM lote WHERE id LIKE 'a-%' ORDER BY nombre",
      ),
    ).toEqual([
      { nombre: 'Repetido', sync_error: MENSAJE_NOMBRE_REPETIDO },
      { nombre: 'Sin problema', sync_error: null },
    ]);
  });

  it('si el viaje entero falla por falta de red, nada se da por enviado y se reintenta', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    servidor.estado.sinRed = true;

    const sinRed = await sincronizar(ctx, servidor);
    servidor.estado.sinRed = false;
    const conRed = await sincronizar(ctx, servidor);

    expect(sinRed.ok).toBe(false);
    expect(conRed.ok && conRed.resumen.enviados).toBe(1);
    expect(servidor.lotes.size).toBe(1);
  });

  it('si la respuesta se pierde después de que el servidor guardó, reintentar no duplica', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());
    servidor.estado.alResponder = (_metodo, ruta) => {
      if (ruta !== '/api/sync') return;
      servidor.estado.alResponder = null;
      throw new ErrorDeRed('Se cortó al responder');
    };

    await sincronizar(ctx, servidor);
    const segunda = await sincronizar(ctx, servidor);

    expect(segunda.ok && segunda.resumen.conAviso).toBe(0);
    expect(servidor.lotes.size).toBe(1);
    expect(servidor.labores.size).toBe(1);
    expect(await ctx.db.getAllAsync('SELECT id FROM lote WHERE pending = 1')).toEqual([]);
  });

  it('una respuesta con otra forma es un fallo del servidor, no se da nada por enviado', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());

    const resultado = await sincronizar(ctx, {
      pedir: (ruta, peticion) =>
        ruta === '/api/sync' ? Promise.resolve({ resultados: [] }) : servidor.pedir(ruta, peticion),
    });

    expect(resultado).toMatchObject({ ok: false, motivo: 'servidor' });
    expect(await ctx.db.getAllAsync('SELECT id FROM lote WHERE pending = 1')).toHaveLength(1);
  });

  it('con un servidor ANTERIOR (sin esa ruta) usa PUT/DELETE sueltos y lo intenta una sola vez', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.estado.sinEnvioPorLotes = true;
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());
    await crearLabor(ctx, 'a-1', datosLabor({ cantidad: 5 }));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.enviados).toBe(3);
    expect(viajes(servidor)).toEqual([1]);
    expect(servidor.labores.size).toBe(2);
    expect(await ctx.db.getAllAsync('SELECT id FROM labor WHERE pending = 1')).toEqual([]);
  });
});
