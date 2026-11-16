import { listarCosechasDeLote } from '@/repositories/laborRepository';
import type { Contexto } from './contexto';

export interface ProduccionMes {
  /** `AAAA-MM`. */
  readonly mes: string;
  readonly kg: number;
}

export interface Produccion {
  readonly totalKg: number;
  readonly porMes: readonly ProduccionMes[];
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

/** Criterio de aceptación 2 y RF-04: total en kg por lote y por mes. */
export async function produccionDeLote(ctx: Contexto, loteId: string): Promise<Produccion> {
  const cosechas = await listarCosechasDeLote(ctx.db, loteId);
  return {
    totalKg: sumarKg(cosechas.map((cosecha) => cosecha.cantidad)),
    porMes: produccionPorMes(cosechas),
  };
}
