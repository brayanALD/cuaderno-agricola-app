import { crearLabor, borrarLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { costoPorKg, produccionDeLote } from '@/services/produccionService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

describe('costos de producción (D95)', () => {
  it('costoPorKg divide con 2 decimales y no divide por cero', () => {
    expect(costoPorKg(50000, 40)).toBe(1250);
    expect(costoPorKg(100, 3)).toBe(33.33);
    expect(costoPorKg(8000, 0)).toBeNull();
  });

  it('suma el costo de todas las labores vivas del lote y lo reparte entre los kilos cosechados', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-08', cantidad: 40, costo: 20000 }),
    );
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'abono', fecha: '2026-09-01', costo: 30000 }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-09-02' }));
    const borrada = await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'poda', fecha: '2026-09-03', costo: 999 }),
    );
    await borrarLabor(ctx, borrada.ok ? borrada.valor.id : '');

    expect(await produccionDeLote(ctx, 'id-1')).toMatchObject({
      totalKg: 40,
      costoTotal: 50000,
      costoPorKg: 1250,
    });
  });

  it('con costos pero sin cosecha: hay costo total y el costo por kg es null', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'abono', fecha: '2026-09-01', costo: 8000 }));

    expect(await produccionDeLote(ctx, 'id-1')).toMatchObject({
      costoTotal: 8000,
      costoPorKg: null,
    });
  });

  it('un costo negativo se rechaza', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());

    const resultado = await crearLabor(ctx, 'id-1', datosLabor({ costo: -1 }));

    expect(!resultado.ok && resultado.errores.costo).toBe('El costo no puede ser negativo.');
  });
});
