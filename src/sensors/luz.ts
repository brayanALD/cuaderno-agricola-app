import type { Luz } from '@/db/modelo';

/**
 * Por encima de esta iluminancia (lux) se considera «soleado». Referencias: interior ~100–500 lx, día
 * nublado ~1 000–10 000 lx, sol directo > 10 000 lx. Es una estimación (D88): el usuario puede corregirla.
 */
export const UMBRAL_SOLEADO_LUX = 10_000;

/** Lógica pura (regla de la especificación): convierte la lectura del sensor en la opción de la labor. */
export const clasificarLuz = (lux: number): Luz =>
  lux >= UMBRAL_SOLEADO_LUX ? 'soleado' : 'nublado';
