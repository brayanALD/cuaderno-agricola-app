import { diasEntre, sumarDias } from './fechas';
import { TIPOS_LABOR, type TipoLabor } from '@/db/modelo';

/** Cada cuántos días toca regar (D36); también lo usan los recordatorios de riego (D90). */
export const PERIODO_RIEGO_DIAS = 3;

/**
 * Periodo de cada tipo, en días (D36). Valores genéricos, no de un cultivo concreto.
 * `null` = no es periódica y no se sugiere.
 */
export const PERIODO_DIAS: Readonly<Record<TipoLabor, number | null>> = {
  riego: PERIODO_RIEGO_DIAS,
  abono: 30,
  fumigacion: 15,
  poda: 90,
  cosecha: null,
};

export interface LaborRealizada {
  readonly tipo: TipoLabor;
  readonly fecha: string;
}

export interface Sugerencia {
  readonly tipo: TipoLabor;
  /** Fecha a la que toca la labor. */
  readonly fecha: string;
  /** Negativo si ya está vencida. */
  readonly diasRestantes: number;
}

/** Última labor del tipo; si nunca se hizo, la base es la fecha de siembra. */
function fechaBase(labores: readonly LaborRealizada[], tipo: TipoLabor, siembra: string): string {
  return labores.reduce(
    (ultima, labor) => (labor.tipo === tipo && labor.fecha > ultima ? labor.fecha : ultima),
    siembra,
  );
}

/** Sugiere la labor que vence primero; en un empate gana el tipo que va antes en la tabla. */
export function sugerirProximaLabor(
  fechaSiembra: string,
  labores: readonly LaborRealizada[],
  hoy: string,
): Sugerencia {
  const candidatas = TIPOS_LABOR.flatMap((tipo): Sugerencia[] => {
    const periodo = PERIODO_DIAS[tipo];
    if (periodo === null) return [];
    const fecha = sumarDias(fechaBase(labores, tipo, fechaSiembra), periodo);
    return [{ tipo, fecha, diasRestantes: diasEntre(hoy, fecha) }];
  });
  return candidatas.reduce((mejor, actual) => (actual.fecha < mejor.fecha ? actual : mejor));
}
