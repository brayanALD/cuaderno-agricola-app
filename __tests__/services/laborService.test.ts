import { marcarLoteBorrado } from '@/repositories/loteRepository';
import {
  actualizarLabor,
  borrarLabor,
  crearLabor,
  duplicarLabor,
  listarLaboresDeLote,
  listarLaboresRecientes,
  obtenerLabor,
  proximaLaborDeLote,
  proximasLaboresPorLote,
} from '@/services/laborService';
import { borrarLote, crearLote } from '@/services/loteService';
import { crearContextoDePrueba, datosLabor, datosLote, HOY } from '../helpers/contexto';

const DESPUES = '2026-11-15T09:30:00.000Z';

async function contextoConLote() {
  const ctx = await crearContextoDePrueba();
  await crearLote(ctx, datosLote());
  return ctx; // el lote es `id-1`; la siguiente id nueva es `id-2`
}

describe('crearLabor', () => {
  it('guarda la labor pendiente, sin foto, con las fechas del contexto', async () => {
    const ctx = await contextoConLote();

    const resultado = await crearLabor(ctx, 'id-1', datosLabor({ nota: 'Goteo', luz: 'soleado' }));

    expect(resultado).toEqual({
      ok: true,
      valor: expect.objectContaining({
        id: 'id-2',
        lote_id: 'id-1',
        tipo: 'riego',
        unidad: 'L',
        nota: 'Goteo',
        luz: 'soleado',
        foto_uri: null,
        foto_url: null,
        pending: 1,
        deleted_at: null,
      }),
    });
  });

  it('las cosechas se guardan siempre en kg (D42)', async () => {
    const ctx = await contextoConLote();

    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', unidad: 'arrobas', cantidad: 12.5 }),
    );

    expect(await obtenerLabor(ctx, 'id-2')).toMatchObject({ tipo: 'cosecha', unidad: 'kg' });
  });

  it('avisa si el lote no existe', async () => {
    const ctx = await crearContextoDePrueba();

    expect(await crearLabor(ctx, 'nada', datosLabor())).toEqual({
      ok: false,
      errores: { general: 'El lote no existe.' },
    });
  });

  it('rechaza fecha futura y cosecha anterior a la siembra', async () => {
    const ctx = await contextoConLote();

    const futura = await crearLabor(ctx, 'id-1', datosLabor({ fecha: '2026-11-15' }));
    const temprana = await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-08-15' }),
    );

    expect(futura).toEqual({
      ok: false,
      errores: { fecha: 'Una labor realizada no puede tener fecha futura.' },
    });
    expect(temprana).toEqual({
      ok: false,
      errores: { fecha: 'La cosecha no puede ser anterior a la siembra.' },
    });
    expect(await listarLaboresDeLote(ctx, 'id-1')).toEqual([]);
  });

  it('rechaza una cantidad negativa', async () => {
    const ctx = await contextoConLote();

    const resultado = await crearLabor(ctx, 'id-1', datosLabor({ cantidad: -5 }));

    expect(resultado).toEqual({
      ok: false,
      errores: { cantidad: 'La cantidad no puede ser negativa.' },
    });
  });
});

describe('actualizarLabor', () => {
  it('cambia los datos, conserva la foto y vuelve a marcar pendiente', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor());

    const resultado = await actualizarLabor(
      { ...ctx, ahora: () => DESPUES },
      'id-2',
      datosLabor({ cantidad: 35, nota: 'Más agua' }),
    );

    expect(resultado.ok).toBe(true);
    expect(await obtenerLabor(ctx, 'id-2')).toMatchObject({
      cantidad: 35,
      nota: 'Más agua',
      updated_at: DESPUES,
      pending: 1,
    });
  });

  it('avisa si la labor no existe o los datos son inválidos', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor());

    expect(await actualizarLabor(ctx, 'nada', datosLabor())).toEqual({
      ok: false,
      errores: { general: 'La labor no existe.' },
    });
    expect((await actualizarLabor(ctx, 'id-2', datosLabor({ cantidad: -1 }))).ok).toBe(false);
  });

  it('no edita una labor cuyo lote fue borrado por otro camino', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor());
    await marcarLoteBorrado(ctx.db, 'id-1', DESPUES);

    expect(await actualizarLabor(ctx, 'id-2', datosLabor())).toEqual({
      ok: false,
      errores: { general: 'El lote no existe.' },
    });
  });
});

describe('duplicarLabor (gesto de mantener presionado)', () => {
  it('copia la labor con la fecha de hoy, id nuevo, sin foto y pendiente', async () => {
    const ctx = await contextoConLote();
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ fecha: '2026-11-01', nota: 'Goteo', luz: 'nublado' }),
    );

    const resultado = await duplicarLabor(ctx, 'id-2');

    expect(resultado).toEqual({
      ok: true,
      valor: expect.objectContaining({
        id: 'id-3',
        lote_id: 'id-1',
        fecha: HOY,
        tipo: 'riego',
        cantidad: 20,
        unidad: 'L',
        nota: 'Goteo',
        luz: 'nublado',
        foto_uri: null,
        foto_url: null,
        pending: 1,
      }),
    });
    expect(await obtenerLabor(ctx, 'id-2')).toMatchObject({ fecha: '2026-11-01' });
  });

  it('avisa si la labor no existe', async () => {
    const ctx = await contextoConLote();

    expect(await duplicarLabor(ctx, 'nada')).toEqual({
      ok: false,
      errores: { general: 'La labor no existe.' },
    });
  });
});

describe('borrarLabor y listados', () => {
  it('borra una vez y deja de listarla', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor());

    expect(await borrarLabor({ ...ctx, ahora: () => DESPUES }, 'id-2')).toBe(true);
    expect(await borrarLabor(ctx, 'id-2')).toBe(false);
    expect(await listarLaboresDeLote(ctx, 'id-1')).toEqual([]);
  });

  it('lista por lote y las más recientes', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor({ fecha: '2026-11-01' }));
    await crearLabor(ctx, 'id-1', datosLabor({ fecha: '2026-11-10' }));

    expect((await listarLaboresDeLote(ctx, 'id-1')).map((l) => l.fecha)).toEqual([
      '2026-11-10',
      '2026-11-01',
    ]);
    expect(await listarLaboresRecientes(ctx, 1)).toHaveLength(1);
    expect(await listarLaboresRecientes(ctx)).toHaveLength(2);
  });
});

describe('proximasLaboresPorLote (pestaña «Labores»)', () => {
  it('una sugerencia por lote vivo, la más urgente primero', async () => {
    const ctx = await contextoConLote();
    await crearLote(ctx, datosLote({ nombre: 'La Loma', fecha_siembra: '2026-11-10' }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-11-12' }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'abono', fecha: '2026-11-10' }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'fumigacion', fecha: '2026-11-13' }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'poda', fecha: '2026-11-13' }));

    const proximas = await proximasLaboresPorLote(ctx);

    expect(
      proximas.map((p) => [p.lote.nombre, p.sugerencia.tipo, p.sugerencia.diasRestantes]),
    ).toEqual([
      ['La Loma', 'riego', -1],
      ['El Mirador', 'riego', 1],
    ]);
  });

  it('no incluye lotes borrados y sin lotes devuelve una lista vacía', async () => {
    const ctx = await crearContextoDePrueba();
    expect(await proximasLaboresPorLote(ctx)).toEqual([]);

    await crearLote(ctx, datosLote());
    await borrarLote(ctx, 'id-1');

    expect(await proximasLaboresPorLote(ctx)).toEqual([]);
  });
});

describe('proximaLaborDeLote (RF-03)', () => {
  it('sugiere según las labores del lote y la fecha de hoy', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-11-12' }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'abono', fecha: '2026-11-10' }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'fumigacion', fecha: '2026-11-13' }));
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'poda', fecha: '2026-11-13' }));

    const sugerencia = await proximaLaborDeLote(ctx, 'id-1');

    expect(sugerencia).toEqual({ tipo: 'riego', fecha: '2026-11-15', diasRestantes: 1 });
  });

  it('un tipo nunca registrado vence desde la siembra (D36)', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'riego', fecha: '2026-11-12' }));

    expect(await proximaLaborDeLote(ctx, 'id-1')).toMatchObject({
      tipo: 'fumigacion',
      fecha: '2026-08-31',
    });
  });

  it('devuelve null si el lote no existe', async () => {
    const ctx = await crearContextoDePrueba();

    expect(await proximaLaborDeLote(ctx, 'nada')).toBeNull();
  });
});
