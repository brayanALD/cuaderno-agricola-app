import { crearLabor, borrarLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { produccionDeLote, produccionPorMes, sumarKg } from '@/services/produccionService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

describe('sumarKg', () => {
  it('suma sin errores de coma flotante', () => {
    expect(sumarKg([0.1, 0.2, 0.3])).toBe(0.6);
  });

  it('una lista vacía suma 0', () => {
    expect(sumarKg([])).toBe(0);
  });
});

describe('produccionPorMes', () => {
  it('agrupa por mes y ordena de más antiguo a más reciente', () => {
    const resultado = produccionPorMes([
      { fecha: '2026-11-20', cantidad: 8.25 },
      { fecha: '2026-10-05', cantidad: 12.5 },
      { fecha: '2026-11-02', cantidad: 3.1 },
    ]);

    expect(resultado).toEqual([
      { mes: '2026-10', kg: 12.5 },
      { mes: '2026-11', kg: 11.35 },
    ]);
  });

  it('sin cosechas no hay meses', () => {
    expect(produccionPorMes([])).toEqual([]);
  });
});

describe('produccionDeLote (criterio de aceptación 2)', () => {
  async function contextoConLote() {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    return ctx;
  }

  it('con 3 cosechas, el total del lote es la suma exacta en kg', async () => {
    const ctx = await contextoConLote();
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-10-05', cantidad: 12.5 }),
    );
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-02', cantidad: 8.25 }),
    );
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-10', cantidad: 3.1 }),
    );

    const produccion = await produccionDeLote(ctx, 'id-1');

    expect(produccion.totalKg).toBe(23.85);
    expect(produccion.porMes).toEqual([
      { mes: '2026-10', kg: 12.5 },
      { mes: '2026-11', kg: 11.35 },
    ]);
  });

  it('no cuenta labores que no son cosecha ni cosechas borradas', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', cantidad: 50 }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'cosecha', cantidad: 10 }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'cosecha', cantidad: 99 }));
    await borrarLabor(ctx, 'id-4');

    expect((await produccionDeLote(ctx, 'id-1')).totalKg).toBe(10);
  });

  it('un lote sin cosechas tiene total 0', async () => {
    const ctx = await contextoConLote();

    expect(await produccionDeLote(ctx, 'id-1')).toEqual({
      totalKg: 0,
      porMes: [],
      costoTotal: 0,
      costoPorKg: null,
    });
  });
});
