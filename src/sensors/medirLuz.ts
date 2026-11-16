import { LightSensor } from 'expo-sensors';

export type ResultadoLuz =
  | { readonly tipo: 'lectura'; readonly lux: number }
  | { readonly tipo: 'sin-sensor' }
  | { readonly tipo: 'sin-lectura' }
  | { readonly tipo: 'cancelada' };

/** Milisegundos sin lectura tras los que se deja de esperar (el sensor puede no emitir). */
export const ESPERA_MAXIMA_MS = 4000;

type Suscripcion = { remove: () => void };

/** ¿Hay sensor? Regla 1 de la especificación: `isAvailableAsync()` antes de usarlo; un fallo cuenta como «no». */
async function hayLuz(): Promise<boolean> {
  try {
    return await LightSensor.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Una sola medición de la luz (`LightSensor`, solo Android, sin permisos): se suscribe, espera la primera
 * lectura válida y cancela la suscripción (regla 3), también si pasa el plazo o se aborta con `senal`
 * (p. ej. al salir de la pantalla). Nunca lanza: la app no se rompe si falta el sensor (regla 4).
 */
export async function medirLuz(
  senal?: AbortSignal,
  plazoMs: number = ESPERA_MAXIMA_MS,
): Promise<ResultadoLuz> {
  if (!(await hayLuz())) return { tipo: 'sin-sensor' };
  if (senal?.aborted) return { tipo: 'cancelada' };
  return new Promise<ResultadoLuz>((resolve) => {
    let hecho = false;
    let suscripcion: Suscripcion | null = null;
    const terminar = (resultado: ResultadoLuz) => {
      if (hecho) return;
      hecho = true;
      clearTimeout(plazo);
      suscripcion?.remove();
      senal?.removeEventListener('abort', cancelar);
      resolve(resultado);
    };
    const cancelar = () => terminar({ tipo: 'cancelada' });
    const plazo = setTimeout(() => terminar({ tipo: 'sin-lectura' }), plazoMs);
    senal?.addEventListener('abort', cancelar);
    LightSensor.setUpdateInterval(500);
    suscripcion = LightSensor.addListener(({ illuminance }) => {
      if (Number.isFinite(illuminance) && illuminance >= 0) {
        terminar({ tipo: 'lectura', lux: illuminance });
      }
    });
    if (hecho) suscripcion.remove();
  });
}
