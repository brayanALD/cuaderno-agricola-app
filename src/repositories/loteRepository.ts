import type { LoteFila, LoteRemoto } from '@/db/modelo';
import type { Db } from '@/db/tipos';
import { patronLike } from './like';

const COLUMNAS =
  'id, nombre, cultivo, area_m2, altitud_m, lat, lng, fecha_siembra, created_at, updated_at, deleted_at, pending, sync_error, finca, version_servidor, conflicto';
const ORDEN = 'ORDER BY nombre COLLATE NOCASE, id';

export async function insertarLote(db: Db, lote: LoteFila): Promise<void> {
  await db.runAsync(
    `INSERT INTO lote (${COLUMNAS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      lote.id,
      lote.nombre,
      lote.cultivo,
      lote.area_m2,
      lote.altitud_m,
      lote.lat,
      lote.lng,
      lote.fecha_siembra,
      lote.created_at,
      lote.updated_at,
      lote.deleted_at,
      lote.pending,
      lote.sync_error,
      lote.finca,
      lote.version_servidor,
      lote.conflicto,
    ],
  );
}

/** Devuelve cuántas filas cambió: 0 si el lote no existe o está borrado. */
export async function actualizarLote(db: Db, lote: LoteFila): Promise<number> {
  const resultado = await db.runAsync(
    `UPDATE lote SET nombre = ?, cultivo = ?, area_m2 = ?, altitud_m = ?, lat = ?, lng = ?,
       fecha_siembra = ?, updated_at = ?, pending = ?, sync_error = ?, finca = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [
      lote.nombre,
      lote.cultivo,
      lote.area_m2,
      lote.altitud_m,
      lote.lat,
      lote.lng,
      lote.fecha_siembra,
      lote.updated_at,
      lote.pending,
      lote.sync_error,
      lote.finca,
      lote.id,
    ],
  );
  return resultado.changes;
}

export function obtenerLote(db: Db, id: string): Promise<LoteFila | null> {
  return db.getFirstAsync<LoteFila>(
    `SELECT ${COLUMNAS} FROM lote WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
}

/** Lotes vivos por nombre; con `texto`, los que lo contienen en el nombre, el cultivo o la finca (D39, D95). */
export function listarLotes(db: Db, texto?: string): Promise<LoteFila[]> {
  if (texto === undefined || texto.trim() === '') {
    return db.getAllAsync<LoteFila>(
      `SELECT ${COLUMNAS} FROM lote WHERE deleted_at IS NULL ${ORDEN}`,
    );
  }
  const patron = patronLike(texto);
  return db.getAllAsync<LoteFila>(
    `SELECT ${COLUMNAS} FROM lote
     WHERE deleted_at IS NULL
       AND (nombre LIKE ? ESCAPE '\\' OR cultivo LIKE ? ESCAPE '\\' OR finca LIKE ? ESCAPE '\\')
     ${ORDEN}`,
    [patron, patron, patron],
  );
}

/** Nombre repetido entre lotes vivos, sin distinguir mayúsculas; `excluirId` es el lote que se edita. */
export async function existeNombreLote(
  db: Db,
  nombre: string,
  excluirId?: string,
): Promise<boolean> {
  const fila = await db.getFirstAsync<{ existe: number }>(
    `SELECT 1 AS existe FROM lote
     WHERE nombre = ? COLLATE NOCASE AND deleted_at IS NULL AND id <> ? LIMIT 1`,
    [nombre, excluirId ?? ''],
  );
  return fila !== null;
}

export async function marcarLoteBorrado(db: Db, id: string, ahora: string): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE lote SET deleted_at = ?, updated_at = ?, pending = 1 WHERE id = ? AND deleted_at IS NULL',
    [ahora, ahora, id],
  );
  return resultado.changes;
}

/**
 * Lo que falta enviar al servidor (también los borrados), del más antiguo al más nuevo. Lo que está en conflicto
 * espera a que el usuario elija (D96).
 */
export function listarLotesPendientes(db: Db): Promise<LoteFila[]> {
  return db.getAllAsync<LoteFila>(
    `SELECT ${COLUMNAS} FROM lote WHERE pending = 1 AND conflicto IS NULL ORDER BY updated_at, id`,
  );
}

/**
 * Da por enviado el lote SOLO si no cambió mientras se enviaba (`updated_at` igual al enviado): si el
 * usuario lo editó en medio, sigue pendiente y sale en la próxima vuelta. `version` es el `updated_at` que puso
 * el servidor: se guarda SIEMPRE, también si la fila sigue pendiente, para que el próximo envío parta de él (D96).
 */
export async function marcarLoteSincronizado(
  db: Db,
  id: string,
  actualizadoEn: string,
  version: string | null = null,
): Promise<number> {
  if (version !== null) {
    await db.runAsync('UPDATE lote SET version_servidor = ? WHERE id = ?', [version, id]);
  }
  const resultado = await db.runAsync(
    'UPDATE lote SET pending = 0, sync_error = NULL WHERE id = ? AND updated_at = ?',
    [id, actualizadoEn],
  );
  return resultado.changes;
}

/** Guarda por qué el servidor lo rechazó (sigue pendiente); solo si no cambió mientras se enviaba. */
export async function marcarLoteConError(
  db: Db,
  id: string,
  actualizadoEn: string,
  mensaje: string,
): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE lote SET sync_error = ? WHERE id = ? AND updated_at = ?',
    [mensaje, id, actualizadoEn],
  );
  return resultado.changes;
}

/** Existe en la base aunque esté borrado (las labores de un lote borrado siguen apuntándole). */
export async function existeLoteConId(db: Db, id: string): Promise<boolean> {
  const fila = await db.getFirstAsync<{ existe: number }>(
    'SELECT 1 AS existe FROM lote WHERE id = ?',
    [id],
  );
  return fila !== null;
}

export interface LoteConNombre {
  readonly id: string;
  readonly pending: 0 | 1;
  readonly updated_at: string;
}

/** Otro lote vivo con ese nombre (sin distinguir mayúsculas) que cuente para el nombre único: sin aviso. */
export function buscarLoteVivoConNombre(
  db: Db,
  nombre: string,
  excluirId: string,
): Promise<LoteConNombre | null> {
  return db.getFirstAsync<LoteConNombre>(
    `SELECT id, pending, updated_at FROM lote
     WHERE nombre = ? COLLATE NOCASE AND deleted_at IS NULL AND sync_error IS NULL AND id <> ?
     LIMIT 1`,
    [nombre, excluirId],
  );
}

/**
 * Guarda un lote que llegó del servidor, ya sincronizado y con su versión. NO pisa un cambio local pendiente
 * (la condición del `WHERE`): devuelve 0 si lo omitió. `forzar` la quita: es lo que pasa cuando el usuario elige
 * «tomar la del servidor» al resolver un conflicto (D96).
 */
export async function guardarLoteRemoto(db: Db, lote: LoteRemoto, forzar = false): Promise<number> {
  const guardia = forzar ? '' : 'WHERE lote.pending = 0';
  const resultado = await db.runAsync(
    `INSERT INTO lote (${COLUMNAS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, NULL)
     ON CONFLICT(id) DO UPDATE SET nombre = excluded.nombre, cultivo = excluded.cultivo,
       finca = excluded.finca,
       area_m2 = excluded.area_m2, altitud_m = excluded.altitud_m, lat = excluded.lat,
       lng = excluded.lng, fecha_siembra = excluded.fecha_siembra, created_at = excluded.created_at,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, pending = 0,
       sync_error = NULL, version_servidor = excluded.version_servidor, conflicto = NULL
     ${guardia}`,
    [
      lote.id,
      lote.nombre,
      lote.cultivo,
      lote.area_m2,
      lote.altitud_m,
      lote.lat,
      lote.lng,
      lote.fecha_siembra,
      lote.created_at,
      lote.updated_at,
      lote.deleted_at,
      lote.finca,
      lote.updated_at,
    ],
  );
  return resultado.changes;
}
