const PRESION_NIVEL_MAR_HPA = 1013.25;

export const AVISO_ALTITUD_GPS = 'Altitud tomada del GPS: menor precisión que con barómetro.';
export const AVISO_ALTITUD_MANUAL = 'No se pudo medir la altitud; escríbela a mano.';

export type FuenteAltitud = 'barometro' | 'gps' | 'manual';

export interface AltitudElegida {
  readonly metros: number | null;
  readonly fuente: FuenteAltitud;
  readonly aviso: string | null;
}

function esPositivo(valor: number): boolean {
  return Number.isFinite(valor) && valor > 0;
}

/** Fórmula barométrica estándar: 1013,25 hPa equivale a 0 m. */
export function altitudDesdePresion(
  presionHpa: number,
  referenciaHpa: number = PRESION_NIVEL_MAR_HPA,
): number {
  if (!esPositivo(presionHpa) || !esPositivo(referenciaHpa)) {
    throw new RangeError('La presión debe ser un número positivo en hPa.');
  }
  return 44330 * (1 - (presionHpa / referenciaHpa) ** (1 / 5.255));
}

/**
 * Criterio de aceptación 3: sin barómetro, la altitud viene del GPS con aviso de menor
 * precisión; sin ninguno de los dos, se pide a mano. Nunca lanza por falta de sensor.
 */
export function elegirAltitud(entrada: {
  readonly presionHpa: number | null;
  readonly gpsM: number | null;
}): AltitudElegida {
  const { presionHpa, gpsM } = entrada;
  if (presionHpa !== null && esPositivo(presionHpa)) {
    return { metros: altitudDesdePresion(presionHpa), fuente: 'barometro', aviso: null };
  }
  if (gpsM !== null && Number.isFinite(gpsM)) {
    return { metros: gpsM, fuente: 'gps', aviso: AVISO_ALTITUD_GPS };
  }
  return { metros: null, fuente: 'manual', aviso: AVISO_ALTITUD_MANUAL };
}
