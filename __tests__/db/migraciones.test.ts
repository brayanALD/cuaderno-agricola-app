import { migrar, VERSION_ESQUEMA } from '@/db/migraciones';
import { insertarLabor } from '@/repositories/laborRepository';
import { insertarLote } from '@/repositories/loteRepository';
import { crearDbEnMemoria, crearDbMigrada } from '../helpers/baseEnMemoria';
import { laborFila, loteFila } from '../helpers/filas';

const tablas = async (db: Awaited<ReturnType<typeof crearDbMigrada>>) =>
  (
    await db.getAllAsync<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('lote', 'labor', 'sync_estado', 'fotos_por_borrar') ORDER BY name",
    )
  ).map((fila) => fila.name);

describe('migrar', () => {
  it('crea las tablas y deja user_version en la versión actual', async () => {
    const db = await crearDbMigrada();

    expect(await tablas(db)).toEqual(['fotos_por_borrar', 'labor', 'lote', 'sync_estado']);
    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({
      user_version: VERSION_ESQUEMA,
    });
  });

  it('es idempotente: migrar otra vez no falla ni borra datos', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila());

    await migrar(db);

    expect(await db.getAllAsync('SELECT id FROM lote')).toEqual([{ id: 'lote-1' }]);
  });

  it('si una migración falla, no deja la base a medias', async () => {
    const db = crearDbEnMemoria();
    await db.execAsync('CREATE TABLE lote (id TEXT)');

    await expect(migrar(db)).rejects.toThrow();

    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({ user_version: 0 });
    expect(await db.getAllAsync("SELECT name FROM sqlite_master WHERE name = 'labor'")).toEqual([]);
  });
});

/** La base tal como la dejó la versión 1 (antes de la sincronización): sin `sync_error` ni `sync_estado`. */
const ESQUEMA_V1 = `
CREATE TABLE lote (
  id TEXT PRIMARY KEY, nombre TEXT NOT NULL, cultivo TEXT NOT NULL,
  area_m2 INTEGER NOT NULL CHECK (area_m2 > 0), altitud_m REAL CHECK (altitud_m BETWEEN 0 AND 6000),
  lat REAL, lng REAL, fecha_siembra TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  deleted_at TEXT, pending INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1))
);
CREATE UNIQUE INDEX idx_lote_nombre ON lote (nombre COLLATE NOCASE) WHERE deleted_at IS NULL;
CREATE TABLE labor (
  id TEXT PRIMARY KEY, lote_id TEXT NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('riego', 'abono', 'fumigacion', 'poda', 'cosecha')),
  fecha TEXT NOT NULL, cantidad REAL NOT NULL DEFAULT 0 CHECK (cantidad >= 0), unidad TEXT, nota TEXT,
  foto_uri TEXT, foto_url TEXT, luz TEXT CHECK (luz IN ('soleado', 'nublado')),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
  pending INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1))
);
CREATE INDEX idx_labor_lote_fecha ON labor (lote_id, fecha);
PRAGMA user_version = 1;
`;

describe('migración 2 (sincronización, D71–D73)', () => {
  it('una base de la versión 1 con datos sube a la actual sin perder nada', async () => {
    const db = crearDbEnMemoria();
    await db.execAsync(ESQUEMA_V1);
    await db.execAsync(
      `INSERT INTO lote VALUES ('a', 'El Mirador', 'Café', 5000, 1650, 4.65, -75.57, '2026-08-16', 'x', 'x', NULL, 1);
       INSERT INTO labor (id, lote_id, tipo, fecha, created_at, updated_at, pending)
       VALUES ('l1', 'a', 'riego', '2026-11-10', 'x', 'x', 1);`,
    );

    await migrar(db);

    expect(await db.getFirstAsync('PRAGMA user_version')).toEqual({
      user_version: VERSION_ESQUEMA,
    });
    expect(await db.getAllAsync('SELECT id, pending, sync_error FROM lote')).toEqual([
      { id: 'a', pending: 1, sync_error: null },
    ]);
    expect(await db.getAllAsync('SELECT id, pending, sync_error FROM labor')).toEqual([
      { id: 'l1', pending: 1, sync_error: null },
    ]);
    expect(await tablas(db)).toEqual(['fotos_por_borrar', 'labor', 'lote', 'sync_estado']);
  });

  it('un lote con aviso de sincronización no cuenta para el nombre único (así cabe el del servidor)', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'El Mirador', sync_error: 'Choque' }));

    await insertarLote(db, loteFila({ id: 'b', nombre: 'el mirador' }));

    expect(await db.getAllAsync('SELECT id FROM lote ORDER BY id')).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });

  it('dos lotes vivos sin aviso con el mismo nombre siguen prohibidos', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'El Mirador' }));

    await expect(insertarLote(db, loteFila({ id: 'b', nombre: 'EL MIRADOR' }))).rejects.toThrow();
  });
});

describe('restricciones del esquema', () => {
  it.each([
    ['área 0', { area_m2: 0 }],
    ['altitud 6001', { altitud_m: 6001 }],
    ['altitud negativa', { altitud_m: -1 }],
  ])('rechaza un lote con %s', async (_nombre, cambios) => {
    const db = await crearDbMigrada();

    await expect(insertarLote(db, loteFila(cambios))).rejects.toThrow();
  });

  it('rechaza una labor con tipo, luz o cantidad inválidos', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila());

    await expect(insertarLabor(db, laborFila({ tipo: 'cosechar' as never }))).rejects.toThrow();
    await expect(insertarLabor(db, laborFila({ luz: 'lluvia' as never }))).rejects.toThrow();
    await expect(insertarLabor(db, laborFila({ cantidad: -1 }))).rejects.toThrow();
  });

  it('rechaza una labor de un lote que no existe (clave foránea)', async () => {
    const db = await crearDbMigrada();

    await expect(insertarLabor(db, laborFila({ lote_id: 'no-existe' }))).rejects.toThrow();
  });

  it('un borrado físico del lote arrastra sus labores (ON DELETE CASCADE)', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila());
    await insertarLabor(db, laborFila());

    await db.runAsync('DELETE FROM lote WHERE id = ?', ['lote-1']);

    expect(await db.getAllAsync('SELECT id FROM labor')).toEqual([]);
  });

  it('el nombre del lote es único sin distinguir mayúsculas, pero solo entre los no borrados', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'a', nombre: 'El Mirador' }));

    await expect(insertarLote(db, loteFila({ id: 'b', nombre: 'el mirador' }))).rejects.toThrow();

    await db.runAsync('UPDATE lote SET deleted_at = ? WHERE id = ?', [
      '2026-11-14T16:00:00.000Z',
      'a',
    ]);
    await insertarLote(db, loteFila({ id: 'b', nombre: 'el mirador' }));
    expect(await db.getAllAsync('SELECT id FROM lote ORDER BY id')).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });
});
