import { cerrarCiclo, listarCiclos } from '@/services/cicloService';
import { crearLabor } from '@/services/laborService';
import { borrarLote, crearLote, obtenerLote } from '@/services/loteService';
import { produccionDeLote } from '@/services/produccionService';
import { listarCiclosPendientes } from '@/repositories/cicloRepository';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

/** Lote `id-1` de café sembrado el 2026-08-16 (hoy es 2026-11-14) con dos cosechas y un abono con costo. */
async function conCosechas() {
  const ctx = await crearContextoDePrueba();
  await crearLote(ctx, datosLote());
  await crearLabor(
    ctx,
    'id-1',
    datosLabor({ tipo: 'cosecha', fecha: '2026-10-05', cantidad: 12.5 }),
  );
  await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'cosecha', fecha: '2026-11-08', cantidad: 20 }));
  await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'abono', fecha: '2026-09-01', costo: 65000 }));
  return ctx;
}

const cierre = (cambios = {}) => ({
  fecha_fin: '2026-11-10',
  cultivo: 'Maíz',
  fecha_siembra: '2026-11-12',
  ...cambios,
});

describe('cerrarCiclo (D95)', () => {
  it('guarda el ciclo con su cultivo, fechas y kilos, y el lote empieza uno nuevo', async () => {
    const ctx = await conCosechas();

    const resultado = await cerrarCiclo(ctx, 'id-1', cierre());

    expect(resultado.ok && resultado.valor).toMatchObject({
      lote_id: 'id-1',
      cultivo: 'Café',
      fecha_inicio: '2026-08-16',
      fecha_fin: '2026-11-10',
      total_kg: 32.5,
      pending: 1,
    });
    expect(await obtenerLote(ctx, 'id-1')).toMatchObject({
      cultivo: 'Maíz',
      fecha_siembra: '2026-11-12',
      pending: 1,
    });
    expect((await listarCiclos(ctx, 'id-1')).map((c) => c.cultivo)).toEqual(['Café']);
  });

  it('solo cuenta las cosechas hasta la fecha de cierre', async () => {
    const ctx = await conCosechas();

    const resultado = await cerrarCiclo(
      ctx,
      'id-1',
      cierre({ fecha_fin: '2026-10-31', fecha_siembra: '2026-11-01' }),
    );

    expect(resultado.ok && resultado.valor.total_kg).toBe(12.5);
  });

  it('tras cerrar, la producción y el costo del lote cuentan solo el ciclo nuevo', async () => {
    const ctx = await conCosechas();
    await cerrarCiclo(ctx, 'id-1', cierre());
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-13', cantidad: 4, costo: 2000 }),
    );

    expect(await produccionDeLote(ctx, 'id-1')).toMatchObject({
      totalKg: 4,
      costoTotal: 2000,
      costoPorKg: 500,
    });
  });

  it.each([
    ['cierre anterior a la siembra', { fecha_fin: '2026-08-15' }, 'fecha_fin'],
    ['cierre en el futuro', { fecha_fin: '2026-11-15', fecha_siembra: '2026-11-15' }, 'fecha_fin'],
    ['nueva siembra anterior al cierre', { fecha_siembra: '2026-11-09' }, 'fecha_siembra'],
    ['cultivo vacío', { cultivo: '   ' }, 'cultivo'],
    ['fecha inexistente', { fecha_fin: '2026-02-30' }, 'fecha_fin'],
  ])('rechaza %s y no cambia nada', async (_nombre, cambios, campo) => {
    const ctx = await conCosechas();

    const resultado = await cerrarCiclo(ctx, 'id-1', cierre(cambios));

    expect(!resultado.ok && Object.keys(resultado.errores)).toContain(campo);
    expect(await listarCiclos(ctx, 'id-1')).toEqual([]);
    expect((await obtenerLote(ctx, 'id-1'))?.cultivo).toBe('Café');
  });

  it('un lote que no existe da un error general', async () => {
    const ctx = await crearContextoDePrueba();

    expect(await cerrarCiclo(ctx, 'no-existe', cierre())).toEqual({
      ok: false,
      errores: { general: 'El lote no existe.' },
    });
  });

  it('borrar el lote borra también sus ciclos (y quedan pendientes de enviar)', async () => {
    const ctx = await conCosechas();
    await cerrarCiclo(ctx, 'id-1', cierre());

    await borrarLote(ctx, 'id-1');

    expect(await listarCiclos(ctx, 'id-1')).toEqual([]);
    expect((await listarCiclosPendientes(ctx.db)).map((c) => c.deleted_at !== null)).toEqual([
      true,
    ]);
  });
});
