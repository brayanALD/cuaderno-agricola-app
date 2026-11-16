import { altitudDesdePresion, elegirAltitud } from '@/services/altitud';

describe('altitudDesdePresion', () => {
  it('1013,25 hPa equivale a 0 m', () => {
    expect(altitudDesdePresion(1013.25)).toBeCloseTo(0, 5);
  });

  it('900 hPa son unos 989 m', () => {
    expect(Math.abs(altitudDesdePresion(900) - 988.6)).toBeLessThan(1);
  });

  it('a menos presión, más altitud', () => {
    expect(altitudDesdePresion(800)).toBeGreaterThan(altitudDesdePresion(900));
  });

  it('acepta una presión de referencia distinta', () => {
    expect(altitudDesdePresion(1000, 1000)).toBeCloseTo(0, 5);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])('rechaza la presión %s', (presion) => {
    expect(() => altitudDesdePresion(presion)).toThrow(RangeError);
  });
});

describe('elegirAltitud (criterio de aceptación 3)', () => {
  it('con barómetro usa la presión y no avisa', () => {
    const resultado = elegirAltitud({ presionHpa: 900, gpsM: 1500 });

    expect(resultado.fuente).toBe('barometro');
    expect(resultado.aviso).toBeNull();
    expect(Math.abs((resultado.metros ?? 0) - 988.6)).toBeLessThan(1);
  });

  it('sin barómetro usa el GPS con aviso de menor precisión', () => {
    const resultado = elegirAltitud({ presionHpa: null, gpsM: 1500 });

    expect(resultado).toMatchObject({ metros: 1500, fuente: 'gps' });
    expect(resultado.aviso).toContain('menor precisión');
  });

  it('sin barómetro ni GPS pide la entrada manual', () => {
    const resultado = elegirAltitud({ presionHpa: null, gpsM: null });

    expect(resultado).toMatchObject({ metros: null, fuente: 'manual' });
    expect(resultado.aviso).toContain('a mano');
  });

  it('una presión inválida cae al GPS en vez de romper la app', () => {
    const resultado = elegirAltitud({ presionHpa: 0, gpsM: 800 });

    expect(resultado).toMatchObject({ metros: 800, fuente: 'gps' });
  });

  it('un GPS inválido (NaN) también pide la entrada manual', () => {
    const resultado = elegirAltitud({ presionHpa: null, gpsM: Number.NaN });

    expect(resultado).toMatchObject({ metros: null, fuente: 'manual' });
  });
});
