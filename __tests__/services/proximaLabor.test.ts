import { PERIODO_DIAS, sugerirProximaLabor } from '@/services/proximaLabor';

describe('PERIODO_DIAS', () => {
  it('es la tabla fija acordada (D36)', () => {
    expect(PERIODO_DIAS).toEqual({
      riego: 3,
      abono: 30,
      fumigacion: 15,
      poda: 90,
      cosecha: null,
    });
  });
});

describe('sugerirProximaLabor', () => {
  it('sin labores toma la siembra como base y sugiere la que vence primero', () => {
    const sugerencia = sugerirProximaLabor('2026-11-01', [], '2026-11-14');

    expect(sugerencia).toEqual({ tipo: 'riego', fecha: '2026-11-04', diasRestantes: -10 });
  });

  it('suma el periodo a la última labor de cada tipo', () => {
    const labores = [
      { tipo: 'riego', fecha: '2026-11-01' },
      { tipo: 'riego', fecha: '2026-11-12' },
      { tipo: 'abono', fecha: '2026-11-10' },
      { tipo: 'fumigacion', fecha: '2026-11-13' },
      { tipo: 'poda', fecha: '2026-11-13' },
    ] as const;

    const sugerencia = sugerirProximaLabor('2026-08-01', labores, '2026-11-14');

    expect(sugerencia).toEqual({ tipo: 'riego', fecha: '2026-11-15', diasRestantes: 1 });
  });

  it('en un empate gana el tipo que va primero en la tabla', () => {
    const sugerencia = sugerirProximaLabor(
      '2026-11-01',
      [{ tipo: 'riego', fecha: '2026-11-13' }],
      '2026-11-14',
    );

    expect(sugerencia).toEqual({ tipo: 'riego', fecha: '2026-11-16', diasRestantes: 2 });
  });

  it('una cosecha no cuenta como base de ningún tipo ni se sugiere', () => {
    const labores = [{ tipo: 'cosecha', fecha: '2026-11-13' }] as const;

    const sugerencia = sugerirProximaLabor('2026-11-10', labores, '2026-11-14');

    expect(sugerencia).toEqual({ tipo: 'riego', fecha: '2026-11-13', diasRestantes: -1 });
  });

  it('no depende del orden de las labores', () => {
    const a = [
      { tipo: 'riego', fecha: '2026-11-12' },
      { tipo: 'riego', fecha: '2026-11-01' },
    ] as const;
    const b = [...a].reverse();

    expect(sugerirProximaLabor('2026-08-01', a, '2026-11-14')).toEqual(
      sugerirProximaLabor('2026-08-01', b, '2026-11-14'),
    );
  });
});
