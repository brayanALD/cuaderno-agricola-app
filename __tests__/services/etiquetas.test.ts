import {
  estadoDeVencimiento,
  ETIQUETA_LUZ,
  ETIQUETA_TIPO,
  textoDias,
  textoVencimiento,
  UNIDAD_SUGERIDA,
} from '@/services/etiquetas';

describe('estadoDeVencimiento (D104)', () => {
  it.each([
    [-10, 'vencida'],
    [-1, 'vencida'],
    [0, 'hoy'],
    [1, 'proxima'],
    [30, 'proxima'],
  ] as const)('%i días restantes → %s', (dias, estado) => {
    expect(estadoDeVencimiento(dias)).toBe(estado);
  });
});

describe('textoDias (criterio de aceptación 1)', () => {
  it('un lote sembrado hace 90 días dice «90 días»', () => {
    expect(textoDias(90)).toBe('90 días');
  });

  it('singular, hoy y siembra futura', () => {
    expect(textoDias(1)).toBe('1 día');
    expect(textoDias(0)).toBe('Sembrado hoy');
    expect(textoDias(-1)).toBe('Siembra mañana');
    expect(textoDias(-5)).toBe('Siembra en 5 días');
  });
});

describe('textoVencimiento (próxima labor)', () => {
  it.each([
    [0, 'Hoy'],
    [1, 'Mañana'],
    [3, 'En 3 días'],
    [-1, 'Venció ayer'],
    [-10, 'Venció hace 10 días'],
  ])('%i días restantes → «%s»', (dias, texto) => {
    expect(textoVencimiento(dias)).toBe(texto);
  });
});

describe('etiquetas', () => {
  it('cada tipo de labor tiene su nombre, y las cosechas van en kg', () => {
    expect(ETIQUETA_TIPO.fumigacion).toBe('Fumigación');
    expect(Object.keys(ETIQUETA_TIPO)).toHaveLength(5);
    expect(UNIDAD_SUGERIDA.cosecha).toBe('kg');
    expect(ETIQUETA_LUZ.nublado).toBe('Nublado');
  });
});
