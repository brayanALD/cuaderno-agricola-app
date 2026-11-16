import { Barometer } from 'expo-sensors';
import { useEffect, useState } from 'react';

export interface LecturaBarometro {
  /** `null` mientras no se haya consultado (o si está inactivo). */
  readonly disponible: boolean | null;
  readonly presionHpa: number | null;
}

const SIN_LECTURA: LecturaBarometro = { disponible: null, presionHpa: null };
const NO_HAY: LecturaBarometro = { disponible: false, presionHpa: null };

/**
 * Presión atmosférica en hPa. Solo toca el sensor mientras `activo` es verdadero (el usuario pidió la
 * función), consulta `isAvailableAsync()` antes de suscribirse y cancela la suscripción al salir.
 * Ningún celular de prueba tiene barómetro: ahí `disponible` queda en `false` y la altitud sale del GPS.
 */
export function useBarometro(activo: boolean): LecturaBarometro {
  const [lectura, setLectura] = useState<LecturaBarometro>(SIN_LECTURA);

  useEffect(() => {
    if (!activo) return undefined;
    let vigente = true;
    let suscripcion: { remove: () => void } | null = null;

    Barometer.isAvailableAsync()
      .then((hay) => {
        if (!vigente) return;
        if (!hay) {
          setLectura(NO_HAY);
          return;
        }
        setLectura({ disponible: true, presionHpa: null });
        Barometer.setUpdateInterval(1000);
        suscripcion = Barometer.addListener(({ pressure }) => {
          if (vigente) setLectura({ disponible: true, presionHpa: pressure });
        });
      })
      .catch(() => {
        if (vigente) setLectura(NO_HAY);
      });

    return () => {
      vigente = false;
      suscripcion?.remove();
    };
  }, [activo]);

  return lectura;
}
