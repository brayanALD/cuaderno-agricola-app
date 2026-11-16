import type { Db } from './tipos';

/** v1: tablas `lote` y `labor` con el modelo alineado con Firestore (D32). */
const MIGRACION_1 = `
CREATE TABLE lote (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  cultivo TEXT NOT NULL,
  area_m2 INTEGER NOT NULL CHECK (area_m2 > 0),
  altitud_m REAL CHECK (altitud_m BETWEEN 0 AND 6000),
  lat REAL,
  lng REAL,
  fecha_siembra TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  pending INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1))
);
CREATE UNIQUE INDEX idx_lote_nombre ON lote (nombre COLLATE NOCASE) WHERE deleted_at IS NULL;
CREATE TABLE labor (
  id TEXT PRIMARY KEY,
  lote_id TEXT NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('riego', 'abono', 'fumigacion', 'poda', 'cosecha')),
  fecha TEXT NOT NULL,
  cantidad REAL NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  unidad TEXT,
  nota TEXT,
  foto_uri TEXT,
  foto_url TEXT,
  luz TEXT CHECK (luz IN ('soleado', 'nublado')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  pending INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1))
);
CREATE INDEX idx_labor_lote_fecha ON labor (lote_id, fecha);
`;

/**
 * v2: sincronización (D71–D73). `sync_error` guarda por qué el servidor rechazó un cambio; el nombre único
 * de lote deja de contar los que tienen aviso (así cabe el lote del servidor con el mismo nombre) y
 * `sync_estado` guarda el cursor `since` de cada recurso y la última sincronización.
 */
const MIGRACION_2 = `
ALTER TABLE lote ADD COLUMN sync_error TEXT;
ALTER TABLE labor ADD COLUMN sync_error TEXT;
DROP INDEX idx_lote_nombre;
CREATE UNIQUE INDEX idx_lote_nombre ON lote (nombre COLLATE NOCASE)
  WHERE deleted_at IS NULL AND sync_error IS NULL;
CREATE TABLE sync_estado (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
`;

/**
 * v3: fotos (D85). `fotos_por_borrar` recuerda las imágenes del servidor que dejaron de usarse (foto
 * reemplazada o quitada, labor o lote borrados) hasta que se logre borrarlas, también sin conexión.
 */
const MIGRACION_3 = `
CREATE TABLE fotos_por_borrar (url TEXT PRIMARY KEY);
`;

/**
 * v4: ajustes del usuario (D90). Pares clave/valor de ESTE teléfono y esta cuenta (p. ej. si los recordatorios
 * de riego están activos y a qué hora): no se sincronizan.
 */
const MIGRACION_4 = `
CREATE TABLE ajustes (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);
`;

/**
 * v5: funciones de cuaderno agrícola (D95). Finca del lote, producto / días de carencia / costo de la labor y
 * la tabla `ciclo` con los ciclos de cultivo YA CERRADOS de cada lote (el ciclo en curso es el del propio lote).
 */
const MIGRACION_5 = `
ALTER TABLE lote ADD COLUMN finca TEXT;
ALTER TABLE labor ADD COLUMN producto TEXT;
ALTER TABLE labor ADD COLUMN carencia_dias INTEGER CHECK (carencia_dias BETWEEN 0 AND 365);
ALTER TABLE labor ADD COLUMN costo REAL CHECK (costo >= 0);
CREATE TABLE ciclo (
  id TEXT PRIMARY KEY,
  lote_id TEXT NOT NULL REFERENCES lote(id) ON DELETE CASCADE,
  cultivo TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  total_kg REAL NOT NULL DEFAULT 0 CHECK (total_kg >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  pending INTEGER NOT NULL DEFAULT 0 CHECK (pending IN (0, 1)),
  sync_error TEXT
);
CREATE INDEX idx_ciclo_lote ON ciclo (lote_id, fecha_fin);
`;

/** El índice `i` lleva la base de la versión `i` a la `i + 1`. Nunca se editan las ya publicadas. */
const MIGRACIONES: readonly string[] = [
  MIGRACION_1,
  MIGRACION_2,
  MIGRACION_3,
  MIGRACION_4,
  MIGRACION_5,
];

export const VERSION_ESQUEMA = MIGRACIONES.length;

/** Patrón de la documentación de `expo-sqlite`: `PRAGMA user_version`, cada paso en una transacción. */
export async function migrar(db: Db): Promise<void> {
  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const actual = fila?.user_version ?? 0;
  for (const [indice, sql] of MIGRACIONES.entries()) {
    if (indice < actual) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${indice + 1}`);
    });
  }
}
