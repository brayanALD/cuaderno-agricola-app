import { medicionDesdeCoords, textoDeError } from '@/sensors/ubicacion';

describe('medicionDesdeCoords', () => {
  it('toma latitud, longitud, altitud GPS y precisión', () => {
    const medicion = medicionDesdeCoords({
      latitude: 4.6533261,
      longitude: -75.5712346,
      altitude: 1650.4,
      accuracy: 12.3,
    });

    expect(medicion).toEqual({
      lat: 4.653326,
      lng: -75.571235,
      altitudGpsM: 1650.4,
      precisionM: 12.3,
    });
  });

  it('redondea las coordenadas a 6 decimales (≈ 11 cm) y la altitud a 0,1 m', () => {
    const medicion = medicionDesdeCoords({
      latitude: 4.123456789,
      longitude: -75.987654321,
      altitude: 1000.04999,
      accuracy: 5,
    });

    expect(medicion.lat).toBe(4.123457);
    expect(medicion.lng).toBe(-75.987654);
    expect(medicion.altitudGpsM).toBe(1000);
  });

  it.each([null, Number.NaN])('una altitud %s queda como null (no se inventa un 0)', (altitude) => {
    const medicion = medicionDesdeCoords({ latitude: 1, longitude: 2, altitude, accuracy: 5 });

    expect(medicion.altitudGpsM).toBeNull();
  });

  it('una precisión ausente queda como null', () => {
    const medicion = medicionDesdeCoords({
      latitude: 1,
      longitude: 2,
      altitude: 5,
      accuracy: null,
    });

    expect(medicion.precisionM).toBeNull();
  });
});

describe('textoDeError', () => {
  it('usa el mensaje de un Error', () => {
    expect(textoDeError(new Error('Sin señal GPS'))).toBe('Sin señal GPS');
  });

  it('para cualquier otra cosa da un mensaje genérico en español', () => {
    expect(textoDeError('algo')).toBe('No se pudo obtener la ubicación.');
    expect(textoDeError(undefined)).toBe('No se pudo obtener la ubicación.');
  });
});
