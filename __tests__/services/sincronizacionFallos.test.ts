import { leerEstadoSync } from '@/repositories/estadoSyncRepository';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { sincronizar } from '@/services/sincronizacionService';
import { ErrorApi } from '@/api/errores';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearServidorFalso } from '../helpers/servidorFalso';

const pendientes = (ctx: Awaited<ReturnType<typeof crearDispositivo>>['ctx']) =>
  ctx.db.getAllAsync<{ id: string }>('SELECT id FROM lote WHERE pending = 1 ORDER BY id');

describe('sincronizar: cuando no se puede', () => {
  it('sin conexión no marca nada como enviado y avisa que se enviará al volver la red', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.estado.sinRed = true;
    await crearLote(ctx, datosLote());

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado).toEqual({
      ok: false,
      motivo: 'sin-conexion',
      mensaje: 'Sin conexión: tus cambios se enviarán cuando vuelva.',
    });
    expect(await pendientes(ctx)).toEqual([{ id: 'a-1' }]);
    expect(await leerEstadoSync(ctx.db, 'since_lotes')).toBeNull();
    expect(await leerEstadoSync(ctx.db, 'ultima_sync')).toBeNull();
  });

  it('un 401 (la sesión ya no vale) corta la vuelta y lo dice', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.estado.fallarCon = 401;
    await crearLote(ctx, datosLote());

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado).toEqual({
      ok: false,
      motivo: 'sesion',
      mensaje: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
    });
    expect(await pendientes(ctx)).toEqual([{ id: 'a-1' }]);
  });

  it.each([429, 500, 503])(
    'un %i del servidor corta la vuelta y se reintentará',
    async (estado) => {
      const { ctx } = await crearDispositivo();
      const servidor = crearServidorFalso();
      servidor.estado.fallarCon = estado;
      await crearLote(ctx, datosLote());

      const resultado = await sincronizar(ctx, servidor);

      expect(resultado).toEqual({
        ok: false,
        motivo: 'servidor',
        mensaje: `El servidor no pudo sincronizar ahora (código ${String(estado)}). Se reintentará.`,
      });
      expect(await pendientes(ctx)).toEqual([{ id: 'a-1' }]);
    },
  );

  it('si se corta a la mitad, lo ya enviado queda enviado y el resto pendiente', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote({ nombre: 'A' }));
    await crearLote(ctx, datosLote({ nombre: 'B' }));
    // Servidor anterior, sin `POST /api/sync`: se envía fila por fila y el corte llega a la mitad.
    servidor.estado.sinEnvioPorLotes = true;
    servidor.estado.alResponder = (metodo) => {
      if (metodo === 'PUT') servidor.estado.sinRed = true;
    };

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok).toBe(false);
    expect(await pendientes(ctx)).toEqual([{ id: 'a-2' }]);
    expect(servidor.lotes.has('a-1')).toBe(true);
    expect(servidor.lotes.has('a-2')).toBe(false);
  });

  it('al volver la conexión, la siguiente vuelta envía lo que quedó pendiente', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());
    servidor.estado.sinRed = true;
    await sincronizar(ctx, servidor);

    servidor.estado.sinRed = false;
    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.enviados).toBe(2);
    expect(await pendientes(ctx)).toEqual([]);
  });

  it('un 403 al enviar un cambio lo deja con aviso (no corta la vuelta)', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.estado.sinEnvioPorLotes = true;
    const original = servidor.pedir;
    let primera = true;
    await crearLote(ctx, datosLote({ nombre: 'A' }));
    await crearLote(ctx, datosLote({ nombre: 'B' }));

    const resultado = await sincronizar(ctx, {
      pedir: (ruta, peticion) => {
        if (peticion?.metodo === 'PUT' && primera) {
          primera = false;
          return Promise.reject(new ErrorApi(403, 'Prohibido'));
        }
        return original(ruta, peticion);
      },
    });

    expect(resultado.ok && resultado.resumen).toEqual(
      expect.objectContaining({ enviados: 1, conAviso: 1 }),
    );
    expect(
      await ctx.db.getAllAsync('SELECT id, sync_error FROM lote WHERE sync_error IS NOT NULL'),
    ).toEqual([{ id: 'a-1', sync_error: 'El servidor lo rechazó (código 403).' }]);
  });

  it('un fallo del propio programa NO se disfraza de «sin conexión»: se propaga', async () => {
    const { ctx } = await crearDispositivo();
    await crearLote(ctx, datosLote());

    await expect(
      sincronizar(ctx, { pedir: () => Promise.reject(new TypeError('x is not a function')) }),
    ).rejects.toThrow('x is not a function');
  });

  it('una respuesta con forma inesperada cuenta como error del servidor', async () => {
    const { ctx } = await crearDispositivo();

    const resultado = await sincronizar(ctx, { pedir: () => Promise.resolve({ algo: 'raro' }) });

    expect(resultado).toEqual({
      ok: false,
      motivo: 'servidor',
      mensaje: 'El servidor no pudo sincronizar ahora (código 502). Se reintentará.',
    });
  });
});
