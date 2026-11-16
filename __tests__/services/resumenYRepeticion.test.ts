import { borrarLabor, crearLabor, ultimasLaboresPorTipo } from '@/services/laborService';
import { borrarLote, crearLote } from '@/services/loteService';
import { resumenGeneral } from '@/services/resumenService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

/** Hoy es 2026-11-14 en el contexto de prueba. */
async function conDosLotes() {
  const ctx = await crearContextoDePrueba();
  await crearLote(ctx, datosLote({ nombre: 'Uno', fecha_siembra: '2026-08-16' }));
  await crearLote(ctx, datosLote({ nombre: 'Dos', fecha_siembra: '2026-08-16' }));
  return ctx;
}

describe('resumenGeneral (D100)', () => {
  it('sin nada registrado todo vale cero', async () => {
    const ctx = await crearContextoDePrueba();

    expect(await resumenGeneral(ctx)).toEqual({
      lotes: 0,
      vencidas: 0,
      kgDelMes: 0,
      mes: '2026-11',
    });
  });

  it('cuenta los lotes vivos y las labores que tocan hoy o ya vencieron', async () => {
    const ctx = await conDosLotes();
    await crearLote(ctx, datosLote({ nombre: 'Recién sembrado', fecha_siembra: '2026-11-14' }));

    const resumen = await resumenGeneral(ctx);

    // Los dos sembrados en agosto tienen riego vencido; el de hoy no toca hasta dentro de 3 días.
    expect(resumen).toMatchObject({ lotes: 3, vencidas: 2 });
  });

  it('un lote al día no cuenta como vencido', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote({ fecha_siembra: '2026-08-16' }));
    for (const tipo of ['riego', 'abono', 'fumigacion', 'poda'] as const) {
      await crearLabor(ctx, 'id-1', datosLabor({ tipo, fecha: '2026-11-13' }));
    }

    expect((await resumenGeneral(ctx)).vencidas).toBe(0);
  });

  it('suma lo cosechado en el mes de hoy en TODOS los lotes, y solo ese mes', async () => {
    const ctx = await conDosLotes();
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-01', cantidad: 10 }),
    );
    await crearLabor(
      ctx,
      'id-2',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-14', cantidad: 5.5 }),
    );
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-10-31', cantidad: 99 }),
    );
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'riego', fecha: '2026-11-10', cantidad: 400 }),
    );

    expect(await resumenGeneral(ctx)).toMatchObject({ kgDelMes: 15.5, mes: '2026-11' });
  });

  it('no cuenta cosechas borradas ni de lotes borrados', async () => {
    const ctx = await conDosLotes();
    const borrada = await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-02', cantidad: 7 }),
    );
    await crearLabor(
      ctx,
      'id-2',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-03', cantidad: 3 }),
    );
    await borrarLabor(ctx, borrada.ok ? borrada.valor.id : '');

    expect((await resumenGeneral(ctx)).kgDelMes).toBe(3);

    await borrarLote(ctx, 'id-2');
    expect((await resumenGeneral(ctx)).kgDelMes).toBe(0);
    expect((await resumenGeneral(ctx)).lotes).toBe(1);
  });

  it('suma con 2 decimales sin arrastrar errores de punto flotante', async () => {
    const ctx = await conDosLotes();
    for (const cantidad of [0.1, 0.2]) {
      await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'cosecha', fecha: '2026-11-05', cantidad }));
    }

    expect((await resumenGeneral(ctx)).kgDelMes).toBe(0.3);
  });
});

describe('ultimasLaboresPorTipo (D100)', () => {
  it('sin historial no ofrece nada', async () => {
    const ctx = await conDosLotes();

    expect(await ultimasLaboresPorTipo(ctx, 'id-1')).toEqual({});
  });

  it('devuelve la más reciente de cada tipo', async () => {
    const ctx = await conDosLotes();
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-11-01', cantidad: 10 }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-11-09', cantidad: 25 }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'poda', fecha: '2026-10-01', cantidad: 3 }));

    const ultimas = await ultimasLaboresPorTipo(ctx, 'id-1');

    expect(Object.keys(ultimas).sort()).toEqual(['poda', 'riego']);
    expect(ultimas.riego).toMatchObject({ cantidad: 25, fecha: '2026-11-09' });
  });

  it('prefiere la de ESTE lote aunque en otro haya una más reciente', async () => {
    const ctx = await conDosLotes();
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'abono', fecha: '2026-10-01', cantidad: 5 }));
    await crearLabor(ctx, 'id-2', datosLabor({ tipo: 'abono', fecha: '2026-11-10', cantidad: 50 }));

    expect((await ultimasLaboresPorTipo(ctx, 'id-1')).abono?.cantidad).toBe(5);
    expect((await ultimasLaboresPorTipo(ctx, 'id-2')).abono?.cantidad).toBe(50);
  });

  it('si este lote nunca la hizo, usa la más reciente de otro lote', async () => {
    const ctx = await conDosLotes();
    await crearLabor(ctx, 'id-2', datosLabor({ tipo: 'abono', fecha: '2026-10-01', cantidad: 5 }));
    await crearLabor(ctx, 'id-2', datosLabor({ tipo: 'abono', fecha: '2026-11-10', cantidad: 50 }));

    expect((await ultimasLaboresPorTipo(ctx, 'id-1')).abono?.cantidad).toBe(50);
  });

  it('ignora las labores borradas y las de lotes borrados', async () => {
    const ctx = await conDosLotes();
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-11-01', cantidad: 10 }));
    const borrada = await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'riego', fecha: '2026-11-09', cantidad: 25 }),
    );
    await borrarLabor(ctx, borrada.ok ? borrada.valor.id : '');
    await crearLabor(ctx, 'id-2', datosLabor({ tipo: 'poda', fecha: '2026-11-02', cantidad: 4 }));
    await borrarLote(ctx, 'id-2');

    const ultimas = await ultimasLaboresPorTipo(ctx, 'id-1');

    expect(ultimas.riego?.cantidad).toBe(10);
    expect(ultimas.poda).toBeUndefined();
  });
});
