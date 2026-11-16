import { carenciaMasLarga, enCarencia } from '@/services/carencia';
import { crearLabor, carenciaDeLote } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

const labor = (fecha: string, carencia_dias: number | null, producto: string | null = null) => ({
  fecha,
  carencia_dias,
  producto,
});

describe('carenciaMasLarga (D95)', () => {
  it('la cosecha es segura desde la aplicación + sus días de carencia', () => {
    expect(carenciaMasLarga([labor('2026-11-01', 21, 'Mancozeb')])).toEqual({
      hasta: '2026-11-22',
      producto: 'Mancozeb',
      fechaAplicacion: '2026-11-01',
    });
  });

  it('entre varias aplicaciones manda la que termina MÁS TARDE (no la más reciente)', () => {
    const carencia = carenciaMasLarga([
      labor('2026-11-01', 30, 'Sistémico'),
      labor('2026-11-10', 3, 'Contacto'),
      labor('2026-11-12', null),
    ]);

    expect(carencia).toMatchObject({ hasta: '2026-12-01', producto: 'Sistémico' });
  });

  it('sin labores con carencia no hay periodo', () => {
    expect(carenciaMasLarga([labor('2026-11-01', null)])).toBeNull();
    expect(carenciaMasLarga([])).toBeNull();
  });

  it('carencia de 0 días: se puede cosechar el mismo día', () => {
    const carencia = carenciaMasLarga([labor('2026-11-10', 0)]);

    expect(enCarencia('2026-11-10', carencia)).toBe(false);
  });
});

describe('enCarencia', () => {
  const carencia = carenciaMasLarga([labor('2026-11-01', 21)]);

  it('antes del día seguro está en carencia; ese día y después, no', () => {
    expect(enCarencia('2026-11-21', carencia)).toBe(true);
    expect(enCarencia('2026-11-22', carencia)).toBe(false);
    expect(enCarencia('2026-12-01', carencia)).toBe(false);
  });

  it('sin periodo de carencia nunca lo está', () => {
    expect(enCarencia('2026-11-10', null)).toBe(false);
  });
});

describe('carenciaDeLote', () => {
  it('lee las fumigaciones del lote y permite excluir la labor que se edita', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    const fumigacion = await crearLabor(
      ctx,
      'id-1',
      datosLabor({
        tipo: 'fumigacion',
        fecha: '2026-11-01',
        producto: 'Mancozeb',
        carencia_dias: 21,
      }),
    );
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-11-05' }));

    expect(await carenciaDeLote(ctx, 'id-1')).toMatchObject({ hasta: '2026-11-22' });
    expect(await carenciaDeLote(ctx, 'id-1', fumigacion.ok ? fumigacion.valor.id : '')).toBeNull();
    expect(await carenciaDeLote(ctx, 'no-existe')).toBeNull();
  });
});
