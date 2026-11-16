import { launchImageLibraryAsync } from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { useCuaderno } from '@/context/CuadernoContext';

export interface Galeria {
  /** Abre la galería y devuelve la ruta de la copia permanente, o `null` si se canceló o falló. */
  readonly elegir: () => Promise<string | null>;
  readonly error: string | null;
}

/**
 * Foto de la labor desde la galería (D34). Al elegirla se reduce y se guarda una copia permanente en el
 * teléfono (D83): la ruta del selector está en la caché y Android puede limpiarla. Se abre solo cuando el
 * usuario lo pide y nunca lanza: si falla, devuelve `null` y deja un mensaje.
 */
export function useGaleria(): Galeria {
  const { ctx } = useCuaderno();
  const [error, setError] = useState<string | null>(null);

  const elegir = useCallback(async () => {
    setError(null);
    let elegida: string | null;
    try {
      // Calidad 1: el selector no recomprime; la reducción y el 70 % los hace `PuertoFotos` una sola vez.
      const resultado = await launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      elegida = resultado.canceled ? null : (resultado.assets[0]?.uri ?? null);
    } catch {
      setError('No se pudo abrir la galería. Intenta de nuevo.');
      return null;
    }
    if (elegida === null) return null;
    try {
      return await ctx.fotos.guardar(elegida, ctx.nuevoId());
    } catch {
      setError('No se pudo preparar la foto. Intenta de nuevo.');
      return null;
    }
  }, [ctx]);

  return { elegir, error };
}
