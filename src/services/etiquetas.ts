import type { Luz, TipoLabor } from '@/db/modelo';

export const ETIQUETA_TIPO: Readonly<Record<TipoLabor, string>> = {
  riego: 'Riego',
  abono: 'Abono',
  fumigacion: 'Fumigación',
  poda: 'Poda',
  cosecha: 'Cosecha',
};

export const ETIQUETA_LUZ: Readonly<Record<Luz, string>> = {
  soleado: 'Soleado',
  nublado: 'Nublado',
};

/** Criterio de aceptación 1: «90 días». Cero y negativos tienen su propio texto. */
export function textoDias(dias: number): string {
  if (dias === 0) return 'Sembrado hoy';
  if (dias === 1) return '1 día';
  if (dias === -1) return 'Siembra mañana';
  return dias > 0 ? `${dias} días` : `Siembra en ${-dias} días`;
}

/** Cuándo toca la próxima labor sugerida (`diasRestantes` negativo = ya venció). */
export function textoVencimiento(diasRestantes: number): string {
  if (diasRestantes === 0) return 'Hoy';
  if (diasRestantes === 1) return 'Mañana';
  if (diasRestantes > 1) return `En ${diasRestantes} días`;
  if (diasRestantes === -1) return 'Venció ayer';
  return `Venció hace ${-diasRestantes} días`;
}

export type EstadoDeVencimiento = 'vencida' | 'hoy' | 'proxima';

/** Cómo se presenta una labor sugerida: vencida (rojo suave), de hoy (dorado) o próxima (neutra), D104. */
export function estadoDeVencimiento(diasRestantes: number): EstadoDeVencimiento {
  if (diasRestantes < 0) return 'vencida';
  return diasRestantes === 0 ? 'hoy' : 'proxima';
}

/** Unidad sugerida al elegir el tipo (las cosechas siempre van en kg, D42). */
export const UNIDAD_SUGERIDA: Readonly<Record<TipoLabor, string>> = {
  riego: 'L',
  abono: 'kg',
  fumigacion: 'L',
  poda: 'ramas',
  cosecha: 'kg',
};
