import { listarCosechasDeLote, sumarCostosDeLote } from '@/repositories/laborRepository';
import { obtenerLote } from '@/repositories/loteRepository';
import type { Contexto } from './contexto';

export interface ProduccionMes {
  /** `AAAA-MM`. */
  readonly mes: string;
  readonly kg: number;
}

export interface Produccion {
  readonly totalKg: number;
  readonly porMes: readonly ProduccionMes[];
  /** Suma de los costos de las labores del ciclo en curso (D95). */
  readonly costoTotal: number;
  /** Costo por kilo cosechado; `null` si aún no hay cosecha. */
  readonly costoPorKg: number | null;
}

interface Cosecha {
  readonly fecha: string;
  readonly cantidad: number;
}

/** Suma redondeada a 2 decimales: 0,1 + 0,2 + 0,3 da 0,6 y no 0,6000000000000001. */
export function sumarKg(cantidades: readonly number[]): number {
  return Math.round(cantidades.reduce((total, cantidad) => total + cantidad, 0) * 100) / 100;
}

export function produccionPorMes(cosechas: readonly Cosecha[]): ProduccionMes[] {
  const porMes = new Map<string, number[]>();
  for (const { fecha, cantidad } of cosechas) {
    const mes = fecha.slice(0, 7);
    porMes.set(mes, [...(porMes.get(mes) ?? []), cantidad]);
  }
  return [...porMes.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mes, cantidades]) => ({ mes, kg: sumarKg(cantidades) }));
}

/** Costo por kg con 2 decimales; sin cosecha no se divide por cero. */
export const costoPorKg = (costoTotal: number, totalKg: number): number | null =>
  totalKg > 0 ? Math.round((costoTotal / totalKg) * 100) / 100 : null;

/**
 * Criterio de aceptación 2 y RF-04: total en kg por lote y por mes. Cuenta el CICLO EN CURSO: desde la siembra
 * del lote (D95); lo anterior quedó guardado en sus ciclos cerrados.
 */
export async function produccionDeLote(ctx: Contexto, loteId: string): Promise<Produccion> {
  const desde = (await obtenerLote(ctx.db, loteId))?.fecha_siembra ?? '';
  const cosechas = await listarCosechasDeLote(ctx.db, loteId, desde);
  const totalKg = sumarKg(cosechas.map((cosecha) => cosecha.cantidad));
  const costoTotal = sumarKg([await sumarCostosDeLote(ctx.db, loteId, desde)]);
  return {
    totalKg,
    porMes: produccionPorMes(cosechas),
    costoTotal,
    costoPorKg: costoPorKg(costoTotal, totalKg),
  };
}
