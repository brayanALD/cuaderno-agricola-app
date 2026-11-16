import { CONSEJO_GESTOS, consejoVisto, marcarConsejoVisto } from '@/services/ajustesService';
import { mesCorto } from '@/services/fechas';
import { valoresLaborVacios } from '@/services/formularios';
import { crearContextoDePrueba } from '../helpers/contexto';

describe('consejos de una sola vez (D105)', () => {
  it('empiezan sin ver y, una vez marcados, quedan vistos', async () => {
    const ctx = await crearContextoDePrueba();

    expect(await consejoVisto(ctx, CONSEJO_GESTOS)).toBe(false);
    await marcarConsejoVisto(ctx, CONSEJO_GESTOS);
    expect(await consejoVisto(ctx, CONSEJO_GESTOS)).toBe(true);
  });

  it('cada consejo se recuerda por separado', async () => {
    const ctx = await crearContextoDePrueba();

    await marcarConsejoVisto(ctx, 'uno');

    expect(await consejoVisto(ctx, 'uno')).toBe(true);
    expect(await consejoVisto(ctx, 'otro')).toBe(false);
  });
});

describe('mesCorto (eje del gráfico)', () => {
  it.each([
    ['2026-01', 'ene'],
    ['2026-09', 'sep'],
    ['2026-10', 'oct'],
    ['2026-12', 'dic'],
  ])('%s → «%s»', (mes, corto) => {
    expect(mesCorto(mes)).toBe(corto);
  });
});

describe('valoresLaborVacios con el tipo que toca', () => {
  it('sin tipo empieza en riego con su unidad', () => {
    expect(valoresLaborVacios('2026-11-15')).toMatchObject({ tipo: 'riego', unidad: 'L' });
  });

  it('con tipo empieza en él y con la unidad sugerida para ese tipo', () => {
    expect(valoresLaborVacios('2026-11-15', 'cosecha')).toMatchObject({
      tipo: 'cosecha',
      unidad: 'kg',
      fecha: '2026-11-15',
      cantidad: 0,
    });
    expect(valoresLaborVacios('2026-11-15', 'poda').unidad).toBe('ramas');
  });
});
