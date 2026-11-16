import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { medicionDesdeCoords, textoDeError, type Medicion } from './ubicacion';

export type EstadoUbicacion =
  'inactiva' | 'buscando' | 'lista' | 'sin-permiso' | 'no-disponible' | 'error';

interface Resultado {
  readonly estado: EstadoUbicacion;
  readonly medicion: Medicion | null;
  /** Qué pasó y qué hacer (siempre hay una alternativa: escribirla a mano). */
  readonly mensaje: string | null;
}

export interface UbicacionActual extends Resultado {
  readonly obtener: () => Promise<void>;
}

const INACTIVA: Resultado = { estado: 'inactiva', medicion: null, mensaje: null };
const BUSCANDO: Resultado = { estado: 'buscando', medicion: null, mensaje: null };
const NO_DISPONIBLE: Resultado = {
  estado: 'no-disponible',
  medicion: null,
  mensaje:
    'La ubicación del teléfono está apagada: activa la ubicación o escribe los datos a mano.',
};
const SIN_PERMISO: Resultado = {
  estado: 'sin-permiso',
  medicion: null,
  mensaje: 'Sin permiso de ubicación. Puedes escribir las coordenadas y la altitud a mano.',
};

/**
 * Ubicación del lote «aquí» (RF-02). Respeta las reglas de la sección 5: comprueba que el servicio
 * exista antes de usarlo, pide el permiso **solo** cuando el usuario llama a `obtener()` y nunca
 * lanza: cualquier fallo es un estado con un mensaje y la opción manual sigue disponible.
 */
export function useUbicacion(): UbicacionActual {
  const [resultado, setResultado] = useState<Resultado>(INACTIVA);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const obtener = useCallback(async () => {
    const poner = (nuevo: Resultado) => {
      if (montado.current) setResultado(nuevo);
    };
    poner(BUSCANDO);
    try {
      if (!(await Location.hasServicesEnabledAsync())) return poner(NO_DISPONIBLE);
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (permiso.status !== 'granted') return poner(SIN_PERMISO);
      const posicion = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      poner({ estado: 'lista', medicion: medicionDesdeCoords(posicion.coords), mensaje: null });
    } catch (error) {
      poner({ estado: 'error', medicion: null, mensaje: textoDeError(error) });
    }
  }, []);

  return { ...resultado, obtener };
}
