import { ajustarCantidad, cantidadPorArrastre, formatearCantidad } from '@/services/cantidad';

describe('ajustarCantidad (botones + y −)', () => {
  it('suma y resta pasos', () => {
    expect(ajustarCantidad(5, 1, 1)).toBe(6);
    expect(ajustarCantidad(5, -2, 0.5)).toBe(4);
  });

  it('nunca baja de cero (la cantidad es ≥ 0)', () => {
    expect(ajustarCantidad(0, -1, 1)).toBe(0);
  });

  it('respeta un máximo si existe', () => {
    expect(ajustarCantidad(9, 5, 1, 10)).toBe(10);
  });

  it('evita errores de coma flotante', () => {
    expect(ajustarCantidad(0.1, 2, 0.1)).toBe(0.3);
  });
});

describe('cantidadPorArrastre (gesto vertical)', () => {
  const base = { inicial: 5, pxPorPaso: 20, paso: 1 };

  it('arrastrar hacia arriba aumenta la cantidad', () => {
    expect(cantidadPorArrastre({ ...base, traslacionY: -100 })).toBe(10);
  });

  it('arrastrar hacia abajo la disminuye', () => {
    expect(cantidadPorArrastre({ ...base, traslacionY: 60 })).toBe(2);
  });

  it('sin movimiento conserva el valor', () => {
    expect(cantidadPorArrastre({ ...base, traslacionY: 0 })).toBe(5);
  });

  it('no baja de cero', () => {
    expect(cantidadPorArrastre({ ...base, traslacionY: 500 })).toBe(0);
  });

  it('un movimiento menor a medio paso no cambia nada', () => {
    expect(cantidadPorArrastre({ ...base, traslacionY: -9 })).toBe(5);
  });

  it('usa el paso decimal', () => {
    expect(cantidadPorArrastre({ inicial: 1, pxPorPaso: 20, paso: 0.5, traslacionY: -40 })).toBe(2);
  });

  it.each([0, -1])('rechaza pxPorPaso %s', (pxPorPaso) => {
    expect(() => cantidadPorArrastre({ ...base, pxPorPaso, traslacionY: -20 })).toThrow(RangeError);
  });
});

describe('formatearCantidad (H3: coma decimal en toda la app)', () => {
  it.each([
    [5.1, '5,1'],
    [8.25, '8,25'],
    [10.5, '10,5'],
    [10, '10'],
    [0, '0'],
    [1234.5, '1234,5'],
  ])('%s se muestra «%s»', (valor, texto) => {
    expect(formatearCantidad(valor)).toBe(texto);
  });
});
