import { insertarLabor } from '@/repositories/laborRepository';
import {
  actualizarLote,
  borrarLote,
  crearLote,
  listarLotesConDias,
  obtenerLote,
} from '@/services/loteService';
import { AHORA, laborFila } from '../helpers/filas';
import { crearContextoDePrueba, datosLote } from '../helpers/contexto';

const DESPUES = '2026-11-15T09:30:00.000Z';

describe('crearLote', () => {
  it('guarda el lote pendiente de sincronizar, con id y fechas del contexto', async () => {
    const ctx = await crearContextoDePrueba();

    const resultado = await crearLote(ctx, datosLote());

    expect(resultado).toEqual({
      ok: true,
      valor: expect.objectContaining({
        id: 'id-1',
        nombre: 'El Mirador',
        created_at: AHORA,
        updated_at: AHORA,
        deleted_at: null,
        pending: 1,
      }),
    });
    expect(await obtenerLote(ctx, 'id-1')).toMatchObject({ nombre: 'El Mirador', pending: 1 });
  });

  it('recorta los espacios del nombre', async () => {
    const ctx = await crearContextoDePrueba();

    await crearLote(ctx, datosLote({ nombre: '  La Loma  ' }));

    expect(await obtenerLote(ctx, 'id-1')).toMatchObject({ nombre: 'La Loma' });
  });

  it('devuelve el error de cada campo inválido y no guarda nada', async () => {
    const ctx = await crearContextoDePrueba();

    const resultado = await crearLote(ctx, datosLote({ area_m2: 0, altitud_m: 7000 }));

    expect(resultado).toEqual({
      ok: false,
      errores: {
        area_m2: 'El área debe ser mayor que 0.',
        altitud_m: 'La altitud máxima es 6000 m.',
      },
    });
    expect(await listarLotesConDias(ctx)).toEqual([]);
  });

  it('rechaza un nombre repetido sin distinguir mayúsculas', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());

    const resultado = await crearLote(ctx, datosLote({ nombre: 'el mirador' }));

    expect(resultado).toEqual({
      ok: false,
      errores: { nombre: 'Ya existe un lote con ese nombre.' },
    });
  });

  it('un cuerpo que no es un objeto da errores en vez de lanzar', async () => {
    const ctx = await crearContextoDePrueba();

    const resultado = await crearLote(ctx, null);

    expect(resultado.ok).toBe(false);
  });
});

describe('actualizarLote', () => {
  it('cambia los datos, conserva created_at y vuelve a marcar pendiente', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());

    const resultado = await actualizarLote(
      { ...ctx, ahora: () => DESPUES },
      'id-1',
      datosLote({ area_m2: 7000 }),
    );

    expect(resultado.ok).toBe(true);
    expect(await obtenerLote(ctx, 'id-1')).toMatchObject({
      area_m2: 7000,
      created_at: AHORA,
      updated_at: DESPUES,
      pending: 1,
    });
  });

  it('permite conservar el propio nombre pero no usar el de otro lote', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote({ nombre: 'Uno' }));
    await crearLote(ctx, datosLote({ nombre: 'Dos' }));

    expect((await actualizarLote(ctx, 'id-1', datosLote({ nombre: 'uno' }))).ok).toBe(true);
    expect(await actualizarLote(ctx, 'id-1', datosLote({ nombre: 'DOS' }))).toEqual({
      ok: false,
      errores: { nombre: 'Ya existe un lote con ese nombre.' },
    });
  });

  it('avisa si el lote no existe o los datos son inválidos', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());

    expect(await actualizarLote(ctx, 'nada', datosLote())).toEqual({
      ok: false,
      errores: { general: 'El lote no existe.' },
    });
    const invalido = await actualizarLote(ctx, 'id-1', datosLote({ area_m2: -1 }));
    expect(invalido.ok).toBe(false);
  });
});

describe('borrarLote (D40: borrado lógico en cascada)', () => {
  it('marca el lote y todas sus labores como borrados y pendientes', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote({ nombre: 'Uno' }));
    await crearLote(ctx, datosLote({ nombre: 'Dos' }));
    await insertarLabor(ctx.db, laborFila({ id: 'a', lote_id: 'id-1', pending: 0 }));
    await insertarLabor(ctx.db, laborFila({ id: 'b', lote_id: 'id-2', pending: 0 }));

    expect(await borrarLote({ ...ctx, ahora: () => DESPUES }, 'id-1')).toBe(true);

    expect(
      await ctx.db.getAllAsync('SELECT id, deleted_at, pending FROM lote ORDER BY id'),
    ).toEqual([
      { id: 'id-1', deleted_at: DESPUES, pending: 1 },
      { id: 'id-2', deleted_at: null, pending: 1 },
    ]);
    expect(
      await ctx.db.getAllAsync('SELECT id, deleted_at, pending FROM labor ORDER BY id'),
    ).toEqual([
      { id: 'a', deleted_at: DESPUES, pending: 1 },
      { id: 'b', deleted_at: null, pending: 0 },
    ]);
  });

  it('devuelve false si el lote no existe o ya estaba borrado', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    await borrarLote(ctx, 'id-1');

    expect(await borrarLote(ctx, 'id-1')).toBe(false);
    expect(await borrarLote(ctx, 'nada')).toBe(false);
  });
});

describe('listarLotesConDias (criterio de aceptación 1)', () => {
  it('muestra 90 días para un lote sembrado hace 90 días', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote({ fecha_siembra: '2026-08-16' }));

    const [lote] = await listarLotesConDias(ctx);

    expect(lote?.dias_desde_siembra).toBe(90);
  });

  it('filtra por texto en el nombre o el cultivo', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote({ nombre: 'Uno', cultivo: 'Café' }));
    await crearLote(ctx, datosLote({ nombre: 'Dos', cultivo: 'Aguacate' }));

    expect((await listarLotesConDias(ctx, 'aguacate')).map((l) => l.nombre)).toEqual(['Dos']);
  });
});
