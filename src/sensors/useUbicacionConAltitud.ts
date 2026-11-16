import { useMemo } from 'react';
import { elegirAltitud, type AltitudElegida } from '@/services/altitud';
import { useBarometro } from './useBarometro';
import { useUbicacion, type UbicacionActual } from './useUbicacion';

export interface UbicacionConAltitud extends UbicacionActual {
  /** `null` hasta que haya una medición. Trae el aviso de menor precisión si sale del GPS. */
  readonly altitud: AltitudElegida | null;
}

/**
 * RF-02 y criterio de aceptación 3: ubicación del lote y su altitud. El barómetro solo se activa
 * mientras se busca la ubicación; si el teléfono no lo tiene, la altitud sale del GPS con aviso, y
 * si tampoco hay altitud GPS, se pide a mano.
 */
export function useUbicacionConAltitud(): UbicacionConAltitud {
  const ubicacion = useUbicacion();
  const activo = ubicacion.estado === 'buscando' || ubicacion.estado === 'lista';
  const { presionHpa } = useBarometro(activo);
  const { medicion } = ubicacion;

  const altitud = useMemo(
    () => (medicion === null ? null : elegirAltitud({ presionHpa, gpsM: medicion.altitudGpsM })),
    [medicion, presionHpa],
  );

  return { ...ubicacion, altitud };
}
