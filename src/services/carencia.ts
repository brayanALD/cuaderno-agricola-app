import { sumarDias } from './fechas';

export interface LaborConCarencia {
  readonly fecha: string;
  readonly carencia_dias: number | null;
  readonly producto: string | null;
}

export interface Carencia {
  /** Primer día en que ya se puede cosechar: aplicación + días de carencia. */
  readonly hasta: string;
  readonly producto: string | null;
  readonly fechaAplicacion: string;
}

/**
 * Periodo de carencia (D95): tras aplicar un producto hay que esperar sus días de carencia antes de cosechar.
 * De todas las aplicaciones manda la que termina más tarde; `null` si ninguna labor tiene carencia.
 * Función pura: la fecha de hoy la compara quien la usa.
 */
export function carenciaMasLarga(labores: readonly LaborConCarencia[]): Carencia | null {
  let mayor: Carencia | null = null;
  for (const labor of labores) {
    if (labor.carencia_dias === null) continue;
    const hasta = sumarDias(labor.fecha, labor.carencia_dias);
    if (mayor === null || hasta > mayor.hasta) {
      mayor = { hasta, producto: labor.producto, fechaAplicacion: labor.fecha };
    }
  }
  return mayor;
}

/** ¿Una cosecha de ese día cae dentro del periodo de carencia? */
export const enCarencia = (fechaCosecha: string, carencia: Carencia | null): boolean =>
  carencia !== null && fechaCosecha < carencia.hasta;
