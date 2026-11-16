/** Lo que usamos de `LocationObjectCoords` de expo-location. */
export interface CoordsGps {
  readonly latitude: number;
  readonly longitude: number;
  readonly altitude: number | null;
  readonly accuracy: number | null;
}

export interface Medicion {
  readonly lat: number;
  readonly lng: number;
  /** Altitud del GPS; `null` si el teléfono no la entrega (no se inventa un 0). */
  readonly altitudGpsM: number | null;
  readonly precisionM: number | null;
}

const redondear = (valor: number, decimales: number): number => {
  const factor = 10 ** decimales;
  return Math.round(valor * factor) / factor;
};

const numeroOnull = (valor: number | null, decimales: number): number | null =>
  valor === null || !Number.isFinite(valor) ? null : redondear(valor, decimales);

/** Coordenadas a 6 decimales (≈ 11 cm), altitud y precisión a 0,1 m. */
export function medicionDesdeCoords(coords: CoordsGps): Medicion {
  return {
    lat: redondear(coords.latitude, 6),
    lng: redondear(coords.longitude, 6),
    altitudGpsM: numeroOnull(coords.altitude, 1),
    precisionM: numeroOnull(coords.accuracy, 1),
  };
}

export const textoDeError = (error: unknown): string =>
  error instanceof Error ? error.message : 'No se pudo obtener la ubicación.';
