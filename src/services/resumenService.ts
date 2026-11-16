import { listarCosechasEntre, contarLotesVivos } from '@/repositories/resumenRepository';
import type { Contexto } from './contexto';
import { proximasLaboresPorLote } from './laborService';
import { sumarKg } from './produccionService';

export interface Resumen {
  readonly lotes: number;
  /** Lotes cuya próxima labor sugerida toca hoy o ya venció (RF-03). */
  readonly vencidas: number;
  /** Lo cosechado en el mes de hoy en todos los lotes, en kg. */
  readonly kgDelMes: number;
  /** El mes de `kgDelMes`, `AAAA-MM`. */
  readonly mes: string;
}

/**
 * Resumen de toda la finca para la pantalla de inicio (D100). El mes es el calendario del día de hoy: cuenta toda
 * cosecha de ese mes, también la de un ciclo que ya se cerró (la producción de un lote cuenta solo el ciclo en
 * curso, D95; esto es otra cosa: lo cosechado este mes).
 */
export async function resumenGeneral(ctx: Contexto): Promise<Resumen> {
  const mes = ctx.hoy().slice(0, 7);
  const [lotes, proximas, cosechas] = await Promise.all([
    contarLotesVivos(ctx.db),
    proximasLaboresPorLote(ctx),
    listarCosechasEntre(ctx.db, `${mes}-01`, `${mes}-31`),
  ]);
  return {
    lotes,
    vencidas: proximas.filter(({ sugerencia }) => sugerencia.diasRestantes <= 0).length,
    kgDelMes: sumarKg(cosechas.map((cosecha) => cosecha.cantidad)),
    mes,
  };
}
