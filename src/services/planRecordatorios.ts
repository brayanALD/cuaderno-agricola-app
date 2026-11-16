import { diasEntre, fechaDesdeISO, formatearFecha, sumarDias } from './fechas';
import type { AvisoProgramado } from './notificaciones';
import { PERIODO_RIEGO_DIAS } from './proximaLabor';

export const HORA_POR_DEFECTO = '07:00';

/** `HH:MM` de 24 horas. */
export const esHoraValida = (hora: string): boolean => /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

export interface LoteParaPlan {
  readonly id: string;
  readonly nombre: string;
  readonly fecha_siembra: string;
}

export interface RiegoRealizado {
  readonly lote_id: string;
  readonly fecha: string;
}

/** Instante local de `fecha` (`AAAA-MM-DD`) a la `hora` (`HH:MM`). */
function instante(fecha: string, hora: string): Date {
  const [horas = 0, minutos = 0] = hora.split(':').map(Number);
  const cuando = fechaDesdeISO(fecha);
  cuando.setHours(horas, minutos, 0, 0);
  return cuando;
}

/** Último riego del lote o, si nunca se regó, su siembra (igual que la próxima labor sugerida, D36). */
function fechaBase(lote: LoteParaPlan, riegos: readonly RiegoRealizado[]): string {
  return riegos.reduce(
    (ultima, riego) => (riego.lote_id === lote.id && riego.fecha > ultima ? riego.fecha : ultima),
    lote.fecha_siembra,
  );
}

/** Cuándo suena: a la hora elegida del día que toca; si ya pasó (o venció), en la próxima ocasión de esa hora. */
function cuandoSuena(toca: string, hoy: string, hora: string, ahora: Date): Date {
  const previsto = instante(toca, hora);
  if (previsto > ahora) return previsto;
  const hoyAHora = instante(hoy, hora);
  return hoyAHora > ahora ? hoyAHora : instante(sumarDias(hoy, 1), hora);
}

/**
 * Un aviso por lote para el próximo riego: el último riego + 3 días (D36) a la hora elegida (D90). Función
 * pura: no toca el reloj ni el sistema. `hoy` es el día local `AAAA-MM-DD` y `ahora` el instante actual.
 */
export function planificarRecordatorios(
  lotes: readonly LoteParaPlan[],
  riegos: readonly RiegoRealizado[],
  hoy: string,
  ahora: Date,
  hora: string,
): AvisoProgramado[] {
  return lotes.map((lote) => {
    const toca = sumarDias(fechaBase(lote, riegos), PERIODO_RIEGO_DIAS);
    const vencido = diasEntre(hoy, toca) < 0;
    return {
      id: `riego-${lote.id}`,
      titulo: `Hora de regar: ${lote.nombre}`,
      cuerpo: vencido
        ? `El riego venció el ${formatearFecha(toca)}.`
        : `Toca regar según tu bitácora (cada ${PERIODO_RIEGO_DIAS} días).`,
      cuando: cuandoSuena(toca, hoy, hora, ahora),
    };
  });
}
