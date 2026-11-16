import { guardarAjuste, leerAjuste } from '@/repositories/ajusteRepository';
import { listarRiegosVivos } from '@/repositories/laborRepository';
import { listarLotes } from '@/repositories/loteRepository';
import type { Contexto } from './contexto';
import { esHoraValida, HORA_POR_DEFECTO, planificarRecordatorios } from './planRecordatorios';
import { exito, fallo, type Resultado } from './resultado';

const CLAVE_ACTIVO = 'recordatorios_activo';
const CLAVE_HORA = 'recordatorios_hora';

export interface ConfigRecordatorios {
  readonly activo: boolean;
  /** `HH:MM`, 24 horas. */
  readonly hora: string;
}

export const MENSAJE_PERMISO_DENEGADO =
  'Para recibir recordatorios, permite las notificaciones de la app en los ajustes del teléfono.';

/** Las reprogramaciones van en fila: dos a la vez se pisarían al cancelar y volver a programar. */
let fila: Promise<unknown> = Promise.resolve();
const enFila = <T>(tarea: () => Promise<T>): Promise<T> => {
  const siguiente = fila.then(tarea, tarea);
  fila = siguiente.catch(() => undefined);
  return siguiente;
};

/** Config guardada de este teléfono y cuenta; por defecto, apagado y a las 7:00 (D90). */
export async function leerConfigRecordatorios(ctx: Contexto): Promise<ConfigRecordatorios> {
  const [activo, hora] = await Promise.all([
    leerAjuste(ctx.db, CLAVE_ACTIVO),
    leerAjuste(ctx.db, CLAVE_HORA),
  ]);
  return {
    activo: activo === '1',
    hora: hora !== null && esHoraValida(hora) ? hora : HORA_POR_DEFECTO,
  };
}

async function programar(ctx: Contexto): Promise<void> {
  const config = await leerConfigRecordatorios(ctx);
  // Sin permiso no se pide nada aquí: el permiso solo se solicita al activar la función.
  if (!config.activo || (await ctx.notificaciones.permiso()) !== 'concedido') {
    await ctx.notificaciones.reemplazarTodos([]);
    return;
  }
  const [lotes, riegos] = await Promise.all([listarLotes(ctx.db), listarRiegosVivos(ctx.db)]);
  const aviso = planificarRecordatorios(
    lotes,
    riegos,
    ctx.hoy(),
    new Date(ctx.ahora()),
    config.hora,
  );
  await ctx.notificaciones.reemplazarTodos(aviso);
}

/**
 * Deja programados los avisos que corresponden a la bitácora y a la config de ahora. Se llama al abrir,
 * tras cada cambio de datos y al cambiar la config: es idempotente (reemplaza todo).
 */
export function reprogramarRecordatorios(ctx: Contexto): Promise<void> {
  return enFila(() => programar(ctx));
}

/** Activa los recordatorios: pide el permiso si hace falta; sin él, no se activa y se explica por qué. */
export async function activarRecordatorios(ctx: Contexto): Promise<Resultado<ConfigRecordatorios>> {
  let permiso = await ctx.notificaciones.permiso();
  if (permiso === 'sin-preguntar') permiso = await ctx.notificaciones.pedirPermiso();
  if (permiso !== 'concedido') return fallo({ general: MENSAJE_PERMISO_DENEGADO });
  await guardarAjuste(ctx.db, CLAVE_ACTIVO, '1');
  await reprogramarRecordatorios(ctx);
  return exito(await leerConfigRecordatorios(ctx));
}

export async function desactivarRecordatorios(ctx: Contexto): Promise<ConfigRecordatorios> {
  await guardarAjuste(ctx.db, CLAVE_ACTIVO, '0');
  await reprogramarRecordatorios(ctx);
  return leerConfigRecordatorios(ctx);
}

export async function cambiarHoraRecordatorios(
  ctx: Contexto,
  hora: string,
): Promise<Resultado<ConfigRecordatorios>> {
  if (!esHoraValida(hora)) return fallo({ hora: 'La hora debe tener el formato HH:MM.' });
  await guardarAjuste(ctx.db, CLAVE_HORA, hora);
  await reprogramarRecordatorios(ctx);
  return exito(await leerConfigRecordatorios(ctx));
}
