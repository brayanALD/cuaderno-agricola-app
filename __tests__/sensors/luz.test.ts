import { clasificarLuz, UMBRAL_SOLEADO_LUX } from '@/sensors/luz';

describe('clasificarLuz (D88)', () => {
  it('interior y nublado: bajo el umbral es «nublado»', () => {
    expect(clasificarLuz(0)).toBe('nublado');
    expect(clasificarLuz(300)).toBe('nublado');
    expect(clasificarLuz(UMBRAL_SOLEADO_LUX - 1)).toBe('nublado');
  });

  it('el umbral exacto y por encima es «soleado»', () => {
    expect(clasificarLuz(UMBRAL_SOLEADO_LUX)).toBe('soleado');
    expect(clasificarLuz(80_000)).toBe('soleado');
  });
});
