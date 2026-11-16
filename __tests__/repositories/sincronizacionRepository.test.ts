import { contarSync, guardarEstadoSync, leerEstadoSync } from '@/repositories/estadoSyncRepository';
import {
  guardarLaborRemota,
  insertarLabor,
  listarLaboresPendientes,
  marcarLaborConError,
  marcarLaborSincronizada,
} from '@/repositories/laborRepository';
import {
  buscarLoteVivoConNombre,
  existeLoteConId,
  guardarLoteRemoto,
  insertarLote,
  listarLotesPendientes,
  marcarLoteConError,
  marcarLoteSincronizado,
} from '@/repositories/loteRepository';
import { crearDbMigrada } from '../helpers/baseEnMemoria';
import { AHORA, laborFila, loteFila } from '../helpers/filas';

const T1 = '2026-11-14T15:00:00.000Z';
const T2 = '2026-11-14T16:00:00.000Z';
const T3 = '2026-11-14T17:00:00.000Z';

const remotoLote = (cambios = {}) => {
  const { pending: _p, sync_error: _s, ...resto } = loteFila({ pending: 0 });
  return { ...resto, ...cambios };
};
const remotaLabor = (cambios = {}) => {
  const { pending: _p, sync_error: _s, foto_uri: _f, ...resto } = laborFila({ pending: 0 });
  return { ...resto, ...cambios };
};

describe('lotes: pendientes y marcas de sincronización', () => {
  it('lista los pendientes (también los borrados) por fecha de cambio y deja fuera los sincronizados', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'c', nombre: 'C', updated_at: T3 }));
    await insertarLote(db, loteFila({ id: 'a', nombre: 'A', updated_at: T1 }));
    await insertarLote(db, loteFila({ id: 'b', nombre: 'B', updated_at: T2, deleted_at: T2 }));
    await insertarLote(db, loteFila({ id: 'd', nombre: 'D', pending: 0 }));

    const filas = await listarLotesPendientes(db);

    expect(filas.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('marcar sincronizado quita pending y el aviso, solo si no cambió mientras tanto', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ updated_at: T1, sync_error: 'Choque' }));

    expect(await marcarLoteSincronizado(db, 'lote-1', T2)).toBe(0);
    expect(await marcarLoteSincronizado(db, 'lote-1', T1)).toBe(1);

    expect(await db.getFirstAsync('SELECT pending, sync_error FROM lote')).toEqual({
      pending: 0,
      sync_error: null,
    });
  });

  it('marcar con error guarda el mensaje, solo si no cambió mientras tanto, y sigue pendiente', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ updated_at: T1 }));

    expect(await marcarLoteConError(db, 'lote-1', T2, 'Choque')).toBe(0);
    expect(await marcarLoteConError(db, 'lote-1', T1, 'Choque')).toBe(1);

    expect(await db.getFirstAsync('SELECT pending, sync_error FROM lote')).toEqual({
      pending: 1,
      sync_error: 'Choque',
    });
  });

  it('existeLoteConId cuenta también los borrados', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ deleted_at: T1 }));

    expect(await existeLoteConId(db, 'lote-1')).toBe(true);
    expect(await existeLoteConId(db, 'otro')).toBe(false);
  });

  it('buscarLoteVivoConNombre ignora mayúsculas, borrados, el propio id y los que ya tienen aviso', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'El Mirador', updated_at: T1 }));
    await insertarLote(db, loteFila({ id: 'b', nombre: 'Borrado', deleted_at: T1 }));
    await insertarLote(db, loteFila({ id: 'c', nombre: 'Con aviso', sync_error: 'x' }));

    expect(await buscarLoteVivoConNombre(db, 'el mirador', 'otro')).toEqual({
      id: 'a',
      pending: 1,
      updated_at: T1,
    });
    expect(await buscarLoteVivoConNombre(db, 'el mirador', 'a')).toBeNull();
    expect(await buscarLoteVivoConNombre(db, 'Borrado', 'otro')).toBeNull();
    expect(await buscarLoteVivoConNombre(db, 'Con aviso', 'otro')).toBeNull();
  });
});

describe('lotes: guardar lo que llega del servidor', () => {
  it('inserta un lote nuevo ya sincronizado', async () => {
    const db = await crearDbMigrada();

    expect(await guardarLoteRemoto(db, remotoLote({ updated_at: T2 }))).toBe(1);

    expect(await db.getFirstAsync('SELECT id, updated_at, pending, sync_error FROM lote')).toEqual({
      id: 'lote-1',
      updated_at: T2,
      pending: 0,
      sync_error: null,
    });
  });

  it('actualiza uno ya sincronizado (también el borrado lógico)', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));

    await guardarLoteRemoto(
      db,
      remotoLote({ nombre: 'Nuevo nombre', updated_at: T2, deleted_at: T2 }),
    );

    expect(
      await db.getFirstAsync('SELECT nombre, updated_at, deleted_at, pending FROM lote'),
    ).toEqual({ nombre: 'Nuevo nombre', updated_at: T2, deleted_at: T2, pending: 0 });
  });

  it('NO pisa un cambio local pendiente', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ nombre: 'Mi cambio', pending: 1 }));

    expect(
      await guardarLoteRemoto(db, remotoLote({ nombre: 'Del servidor', updated_at: T2 })),
    ).toBe(0);

    expect(await db.getFirstAsync('SELECT nombre, pending FROM lote')).toEqual({
      nombre: 'Mi cambio',
      pending: 1,
    });
  });
});

describe('labores: pendientes y marcas', () => {
  const sembrar = async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));
    return db;
  };

  it('lista las pendientes por fecha de cambio, también las borradas', async () => {
    const db = await sembrar();
    await insertarLabor(db, laborFila({ id: 'b', updated_at: T2 }));
    await insertarLabor(db, laborFila({ id: 'a', updated_at: T1, deleted_at: T1 }));
    await insertarLabor(db, laborFila({ id: 'c', pending: 0 }));

    expect((await listarLaboresPendientes(db)).map((f) => f.id)).toEqual(['a', 'b']);
  });

  it('deja fuera las labores de un lote con aviso (esperan a que se arregle)', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'malo', nombre: 'Malo', sync_error: 'Choque' }));
    await insertarLote(db, loteFila({ id: 'bueno', nombre: 'Bueno', pending: 0 }));
    await insertarLabor(db, laborFila({ id: 'l-malo', lote_id: 'malo' }));
    await insertarLabor(db, laborFila({ id: 'l-bueno', lote_id: 'bueno' }));

    expect((await listarLaboresPendientes(db)).map((f) => f.id)).toEqual(['l-bueno']);
  });

  it('marcar sincronizada / con error solo actúa si no cambió mientras tanto', async () => {
    const db = await sembrar();
    await insertarLabor(db, laborFila({ updated_at: T1 }));

    expect(await marcarLaborConError(db, 'labor-1', T2, 'x')).toBe(0);
    expect(await marcarLaborConError(db, 'labor-1', T1, 'Rechazada')).toBe(1);
    expect(await marcarLaborSincronizada(db, 'labor-1', T2)).toBe(0);
    expect(await marcarLaborSincronizada(db, 'labor-1', T1)).toBe(1);

    expect(await db.getFirstAsync('SELECT pending, sync_error FROM labor')).toEqual({
      pending: 0,
      sync_error: null,
    });
  });
});

describe('labores: guardar lo que llega del servidor', () => {
  it('inserta una nueva ya sincronizada', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));

    expect(await guardarLaborRemota(db, remotaLabor())).toBe(1);

    expect(await db.getFirstAsync('SELECT id, pending, foto_uri FROM labor')).toEqual({
      id: 'labor-1',
      pending: 0,
      foto_uri: null,
    });
  });

  it('al actualizar conserva la copia local de la MISMA foto (`foto_uri`) y toma lo demás del servidor', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));
    await insertarLabor(
      db,
      laborFila({
        pending: 0,
        foto_uri: 'file:///cache/a.jpg',
        foto_url: 'https://blob.example/a.jpg',
      }),
    );

    await guardarLaborRemota(
      db,
      remotaLabor({ cantidad: 99, foto_url: 'https://blob.example/a.jpg', updated_at: T2 }),
    );

    expect(
      await db.getFirstAsync('SELECT cantidad, foto_uri, foto_url, updated_at FROM labor'),
    ).toEqual({
      cantidad: 99,
      foto_uri: 'file:///cache/a.jpg',
      foto_url: 'https://blob.example/a.jpg',
      updated_at: T2,
    });
  });

  it('NO pisa un cambio local pendiente', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));
    await insertarLabor(db, laborFila({ cantidad: 5, pending: 1 }));

    expect(await guardarLaborRemota(db, remotaLabor({ cantidad: 99 }))).toBe(0);

    expect(await db.getFirstAsync('SELECT cantidad FROM labor')).toEqual({ cantidad: 5 });
  });
});

describe('estado de sincronización', () => {
  it('guarda y lee valores por clave; guardar otra vez reemplaza', async () => {
    const db = await crearDbMigrada();

    expect(await leerEstadoSync(db, 'since_lotes')).toBeNull();
    await guardarEstadoSync(db, 'since_lotes', T1);
    await guardarEstadoSync(db, 'since_lotes', T2);

    expect(await leerEstadoSync(db, 'since_lotes')).toBe(T2);
    expect(await leerEstadoSync(db, 'since_labores')).toBeNull();
  });

  it('cuenta lo pendiente (también borrados) y los avisos de lo que sigue vivo', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'A', pending: 0 }));
    await insertarLote(db, loteFila({ id: 'b', nombre: 'B', pending: 1 }));
    await insertarLote(db, loteFila({ id: 'c', nombre: 'C', pending: 1, sync_error: 'Choque' }));
    await insertarLote(
      db,
      loteFila({ id: 'd', nombre: 'D', pending: 1, sync_error: 'Choque', deleted_at: AHORA }),
    );
    await insertarLabor(db, laborFila({ id: 'l1', lote_id: 'a', pending: 1 }));
    await insertarLabor(db, laborFila({ id: 'l2', lote_id: 'a', pending: 1, sync_error: 'x' }));
    await insertarLabor(db, laborFila({ id: 'l3', lote_id: 'a', pending: 0 }));

    expect(await contarSync(db)).toEqual({ pendientes: 5, conAviso: 2 });
  });

  it('sin nada pendiente cuenta cero', async () => {
    expect(await contarSync(await crearDbMigrada())).toEqual({ pendientes: 0, conAviso: 0 });
  });
});
