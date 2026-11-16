import {
  actualizarLote,
  existeNombreLote,
  insertarLote,
  listarLotes,
  marcarLoteBorrado,
  obtenerLote,
} from '@/repositories/loteRepository';
import { crearDbMigrada } from '../helpers/baseEnMemoria';
import { AHORA, loteFila } from '../helpers/filas';

const DESPUES = '2026-11-15T09:30:00.000Z';

describe('loteRepository', () => {
  it('guarda y recupera un lote completo', async () => {
    const db = await crearDbMigrada();
    const lote = loteFila({ altitud_m: null, lat: null, lng: null });

    await insertarLote(db, lote);

    expect(await obtenerLote(db, 'lote-1')).toEqual(lote);
  });

  it('devuelve null si el lote no existe o está borrado', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila());
    await marcarLoteBorrado(db, 'lote-1', DESPUES);

    expect(await obtenerLote(db, 'lote-1')).toBeNull();
    expect(await obtenerLote(db, 'otro')).toBeNull();
  });

  it('actualiza los campos editables y la marca de pendiente', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));

    const cambios = await actualizarLote(
      db,
      loteFila({ nombre: 'La Esperanza', area_m2: 7000, updated_at: DESPUES, pending: 1 }),
    );

    expect(cambios).toBe(1);
    expect(await obtenerLote(db, 'lote-1')).toMatchObject({
      nombre: 'La Esperanza',
      area_m2: 7000,
      created_at: AHORA,
      updated_at: DESPUES,
      pending: 1,
    });
  });

  it('no actualiza un lote borrado ni inexistente', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila());
    await marcarLoteBorrado(db, 'lote-1', DESPUES);

    expect(await actualizarLote(db, loteFila({ nombre: 'Otro' }))).toBe(0);
    expect(await actualizarLote(db, loteFila({ id: 'nada' }))).toBe(0);
  });

  it('lista por nombre sin distinguir mayúsculas y sin los borrados', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'b', nombre: 'zeta' }));
    await insertarLote(db, loteFila({ id: 'a', nombre: 'Alfa' }));
    await insertarLote(db, loteFila({ id: 'c', nombre: 'Borrado' }));
    await marcarLoteBorrado(db, 'c', DESPUES);

    const nombres = (await listarLotes(db)).map((lote) => lote.nombre);

    expect(nombres).toEqual(['Alfa', 'zeta']);
  });

  it('busca por nombre o cultivo sin distinguir mayúsculas', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'El Mirador', cultivo: 'Café' }));
    await insertarLote(db, loteFila({ id: 'b', nombre: 'La Loma', cultivo: 'Aguacate' }));

    expect((await listarLotes(db, 'MIRA')).map((l) => l.id)).toEqual(['a']);
    expect((await listarLotes(db, 'aguacate')).map((l) => l.id)).toEqual(['b']);
    expect(await listarLotes(db, 'nada')).toEqual([]);
  });

  it('un texto en blanco lista todo', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'Uno' }));
    await insertarLote(db, loteFila({ id: 'b', nombre: 'Dos' }));

    expect(await listarLotes(db, '   ')).toHaveLength(2);
  });

  it('busca % y _ como texto literal, no como comodines', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'Parcela 100%' }));
    await insertarLote(db, loteFila({ id: 'b', nombre: 'Parcela A_B' }));
    await insertarLote(db, loteFila({ id: 'c', nombre: 'Parcela AxB' }));

    expect((await listarLotes(db, '%')).map((l) => l.id)).toEqual(['a']);
    expect((await listarLotes(db, 'A_B')).map((l) => l.id)).toEqual(['b']);
  });

  it('existeNombreLote ignora mayúsculas, los borrados y el propio lote', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'El Mirador' }));
    await insertarLote(db, loteFila({ id: 'b', nombre: 'Viejo' }));
    await marcarLoteBorrado(db, 'b', DESPUES);

    expect(await existeNombreLote(db, 'el mirador')).toBe(true);
    expect(await existeNombreLote(db, 'el mirador', 'a')).toBe(false);
    expect(await existeNombreLote(db, 'Viejo')).toBe(false);
    expect(await existeNombreLote(db, 'Otro')).toBe(false);
  });

  it('marcarLoteBorrado deja deleted_at, updated_at y pending, y libera el nombre', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));

    expect(await marcarLoteBorrado(db, 'lote-1', DESPUES)).toBe(1);

    expect(await db.getFirstAsync('SELECT deleted_at, updated_at, pending FROM lote')).toEqual({
      deleted_at: DESPUES,
      updated_at: DESPUES,
      pending: 1,
    });
    expect(await marcarLoteBorrado(db, 'lote-1', DESPUES)).toBe(0);
    await insertarLote(db, loteFila({ id: 'nuevo' }));
  });
});
