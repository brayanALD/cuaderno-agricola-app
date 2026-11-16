import { useCameraPermissions, type CameraView, type PermissionResponse } from 'expo-camera';
import { useCallback, useRef, useState, type RefObject } from 'react';
import { useCuaderno } from '@/context/CuadernoContext';

export interface Camara {
  readonly camara: RefObject<CameraView | null>;
  /** `null` mientras se consulta; ahí no se pide nada: el permiso solo se solicita al tocar «Permitir». */
  readonly permiso: PermissionResponse | null;
  readonly pedirPermiso: () => Promise<PermissionResponse>;
  readonly ocupado: boolean;
  readonly error: string | null;
  /** Toma la foto, la reduce y guarda la copia permanente (D83) y la entrega por `alFoto`. */
  readonly capturar: () => Promise<void>;
  /** La vista previa no pudo arrancar (cámara ocupada o dañada): se avisa y queda la galería. */
  readonly alFallarInicio: () => void;
}

/**
 * Lógica de la cámara del formulario (segunda capacidad, P1): permiso, captura y copia permanente.
 * Nunca lanza: si algo falla deja un mensaje y la galería sigue siendo la alternativa.
 */
export function useCamara(alFoto: (uri: string) => void): Camara {
  const { ctx } = useCuaderno();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capturar = useCallback(async () => {
    if (camara.current === null || ocupado) return;
    setOcupado(true);
    setError(null);
    try {
      const foto = await camara.current.takePictureAsync({ quality: 0.8 });
      alFoto(await ctx.fotos.guardar(foto.uri, ctx.nuevoId()));
    } catch {
      setError('No se pudo tomar la foto. Intenta de nuevo.');
    } finally {
      setOcupado(false);
    }
  }, [alFoto, ctx, ocupado]);

  const alFallarInicio = useCallback(
    () =>
      setError(
        'No se pudo iniciar la cámara. Cierra otras apps que la usen o elige de la galería.',
      ),
    [],
  );

  return { camara, permiso, pedirPermiso, ocupado, error, capturar, alFallarInicio };
}
