import { leerAjuste } from '@/repositories/ajusteRepository';
import { crearLabor } from '@/services/laborService';
import { borrarLote, crearLote } from '@/services/loteService';
import {
  activarRecordatorios,
  cambiarHoraRecordatorios,
  desactivarRecordatorios,
  leerConfigRecordatorios,
  reprogramarRecordatorios,
} from '@/services/recordatoriosService';
import { datosLabor, datosLote, crearContextoDePrueba } from '../helpers/contexto';
import { crearNotificacionesEnMemoria } from '../helpers/notificacionesEnMemoria';
import type { EstadoPermiso } from '@/services/notificaciones';

async function montar(permiso: EstadoPermiso = 'concedido') {
  const base = await crearContextoDePrueba();
  const notificaciones = crearNotificacionesEnMemoria(permiso);
  const ctx = { ...base, notificaciones };
  await crearLote(ctx, datosLote());
  return { ctx, notificaciones };
}

describe('recordatorios de riego (D90)', () => {
  it('por defecto están apagados y a las 7:00', async () => {
    const { ctx } = await montar();

    expect(await leerConfigRecordatorios(ctx)).toEqual({ activo: false, hora: '07:00' });
  });

  it('apagados no programan nada (y limpian lo que hubiera)', async () => {
    const { ctx, notificaciones } = await montar();

    await reprogramarRecordatorios(ctx);

    expect(notificaciones.programados).toEqual([]);
  });

  it('activar con permiso ya concedido programa un aviso por lote y guarda el ajuste', async () => {
    const { ctx, notificaciones } = await montar();

    const resultado = await activarRecordatorios(ctx);

    expect(resultado.ok && resultado.valor).toEqual({ activo: true, hora: '07:00' });
    expect(notificaciones.vecesPedido).toBe(0);
    expect(notificaciones.programados.map((a) => a.id)).toEqual(['riego-id-1']);
    expect(await leerAjuste(ctx.db, 'recordatorios_activo')).toBe('1');
  });

  it('activar sin haber preguntado pide el permiso UNA vez, y si lo dan, programa', async () => {
    const { ctx, notificaciones } = await montar('sin-preguntar');

    const resultado = await activarRecordatorios(ctx);

    expect(resultado.ok).toBe(true);
    expect(notificaciones.vecesPedido).toBe(1);
    expect(notificaciones.programados).toHaveLength(1);
  });

  it('si el usuario niega el permiso: no se activa y se explica cómo permitirlo', async () => {
    const { ctx, notificaciones } = await montar('sin-preguntar');
    notificaciones.respuestaAlPedir = 'denegado';

    const resultado = await activarRecordatorios(ctx);

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && resultado.errores.general).toMatch(/ajustes del teléfono/);
    expect((await leerConfigRecordatorios(ctx)).activo).toBe(false);
    expect(notificaciones.programados).toEqual([]);
  });

  it('con el permiso ya denegado para siempre, ni lo vuelve a pedir', async () => {
    const { ctx, notificaciones } = await montar('denegado');

    const resultado = await activarRecordatorios(ctx);

    expect(resultado.ok).toBe(false);
    expect(notificaciones.vecesPedido).toBe(0);
  });

  it('si activados pero se quitó el permiso en los ajustes, reprogramar no pide nada y deja todo apagado', async () => {
    const { ctx, notificaciones } = await montar();
    await activarRecordatorios(ctx);
    notificaciones.estado = 'denegado';

    await reprogramarRecordatorios(ctx);

    expect(notificaciones.programados).toEqual([]);
    expect(notificaciones.vecesPedido).toBe(0);
  });

  it('registrar un riego reprograma: el aviso se mueve a 3 días después del riego', async () => {
    const { ctx, notificaciones } = await montar();
    await activarRecordatorios(ctx);
    const antes = notificaciones.programados[0]?.cuando.getTime();

    await crearLabor(ctx, 'id-1', datosLabor({ fecha: '2026-11-14' }));
    await reprogramarRecordatorios(ctx);

    const despues = notificaciones.programados[0]?.cuando.getTime();
    expect(despues).toBeGreaterThan(antes ?? 0);
    expect(notificaciones.programados).toHaveLength(1);
  });

  it('borrar el lote quita su aviso', async () => {
    const { ctx, notificaciones } = await montar();
    await activarRecordatorios(ctx);

    await borrarLote(ctx, 'id-1');
    await reprogramarRecordatorios(ctx);

    expect(notificaciones.programados).toEqual([]);
  });

  it('desactivar cancela todos los avisos', async () => {
    const { ctx, notificaciones } = await montar();
    await activarRecordatorios(ctx);

    const config = await desactivarRecordatorios(ctx);

    expect(config.activo).toBe(false);
    expect(notificaciones.programados).toEqual([]);
  });

  it('cambiar la hora reprograma a esa hora y se recuerda', async () => {
    const { ctx, notificaciones } = await montar();
    await activarRecordatorios(ctx);

    const resultado = await cambiarHoraRecordatorios(ctx, '18:30');

    expect(resultado.ok && resultado.valor.hora).toBe('18:30');
    expect(notificaciones.programados[0]?.cuando.getHours()).toBe(18);
    expect(notificaciones.programados[0]?.cuando.getMinutes()).toBe(30);
  });

  it('una hora inválida se rechaza y no cambia nada', async () => {
    const { ctx } = await montar();

    const resultado = await cambiarHoraRecordatorios(ctx, '25:99');

    expect(resultado.ok).toBe(false);
    expect((await leerConfigRecordatorios(ctx)).hora).toBe('07:00');
  });

  it('una hora guardada corrupta vuelve a la de por defecto', async () => {
    const { ctx } = await montar();
    await ctx.db.runAsync("INSERT INTO ajustes (clave, valor) VALUES ('recordatorios_hora', 'xx')");

    expect((await leerConfigRecordatorios(ctx)).hora).toBe('07:00');
  });

  it('varias reprogramaciones a la vez no se pisan: queda un solo aviso por lote', async () => {
    const { ctx, notificaciones } = await montar();
    await activarRecordatorios(ctx);

    await Promise.all([
      reprogramarRecordatorios(ctx),
      reprogramarRecordatorios(ctx),
      reprogramarRecordatorios(ctx),
    ]);

    expect(notificaciones.programados).toHaveLength(1);
  });
});
