import type { LaborFila, LaborRemota } from '@/db/modelo';
import type { Db } from '@/db/tipos';
import { patronLike } from './like';

const CAMPOS = [
  'id',
  'lote_id',
  'tipo',
  'fecha',
  'cantidad',
  'unidad',
  'nota',
  'foto_uri',
  'foto_url',
  'luz',
  'created_at',
  'updated_at',
  'deleted_at',
  'pending',
  'sync_error',
  'producto',
  'carencia_dias',
  'costo',
] as const;

const COLUMNAS = CAMPOS.join(', ');
const COLUMNAS_LABOR = CAMPOS.map((campo) => `labor.${campo}`).join(', ');
/** Solo cuentan las labores vivas de lotes vivos. */
const DE_LOTES_VIVOS = 'INNER JOIN lote ON lote.id = labor.lote_id AND lote.deleted_at IS NULL';
const ORDEN = 'ORDER BY labor.fecha DESC, labor.created_at DESC, labor.id';

export async function insertarLabor(db: Db, labor: LaborFila): Promise<void> {
  const marcas = CAMPOS.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT INTO labor (${COLUMNAS}) VALUES (${marcas})`,
    CAMPOS.map((c) => labor[c]),
  );
}

/** Devuelve cuántas filas cambió: 0 si la labor no existe o está borrada. */
export async function actualizarLabor(db: Db, labor: LaborFila): Promise<number> {
  const resultado = await db.runAsync(
    `UPDATE labor SET tipo = ?, fecha = ?, cantidad = ?, unidad = ?, nota = ?, foto_uri = ?,
       foto_url = ?, luz = ?, updated_at = ?, pending = ?, sync_error = ?, producto = ?,
       carencia_dias = ?, costo = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [
      labor.tipo,
      labor.fecha,
      labor.cantidad,
      labor.unidad,
      labor.nota,
      labor.foto_uri,
      labor.foto_url,
      labor.luz,
      labor.updated_at,
      labor.pending,
      labor.sync_error,
      labor.producto,
      labor.carencia_dias,
      labor.costo,
      labor.id,
    ],
  );
  return resultado.changes;
}

export function obtenerLabor(db: Db, id: string): Promise<LaborFila | null> {
  return db.getFirstAsync<LaborFila>(
    `SELECT ${COLUMNAS} FROM labor WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
}

export function listarLaboresDeLote(db: Db, loteId: string): Promise<LaborFila[]> {
  return db.getAllAsync<LaborFila>(
    `SELECT ${COLUMNAS_LABOR} FROM labor ${DE_LOTES_VIVOS}
     WHERE labor.lote_id = ? AND labor.deleted_at IS NULL ${ORDEN}`,
    [loteId],
  );
}

export function listarLaboresRecientes(db: Db, limite: number): Promise<LaborFila[]> {
  return db.getAllAsync<LaborFila>(
    `SELECT ${COLUMNAS_LABOR} FROM labor ${DE_LOTES_VIVOS}
     WHERE labor.deleted_at IS NULL ${ORDEN} LIMIT ?`,
    [limite],
  );
}

/** Labores cuyo tipo o nota contienen el texto (D39). */
export function buscarLabores(db: Db, texto: string): Promise<LaborFila[]> {
  const patron = patronLike(texto);
  return db.getAllAsync<LaborFila>(
    `SELECT ${COLUMNAS_LABOR} FROM labor ${DE_LOTES_VIVOS}
     WHERE labor.deleted_at IS NULL
       AND (labor.tipo LIKE ? ESCAPE '\\' OR labor.nota LIKE ? ESCAPE '\\') ${ORDEN}`,
    [patron, patron],
  );
}

export async function marcarLaborBorrada(db: Db, id: string, ahora: string): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE labor SET deleted_at = ?, updated_at = ?, pending = 1 WHERE id = ? AND deleted_at IS NULL',
    [ahora, ahora, id],
  );
  return resultado.changes;
}

/** Parte del borrado lógico en cascada de un lote (D40). */
export async function marcarLaboresDeLoteBorradas(
  db: Db,
  loteId: string,
  ahora: string,
): Promise<number> {
  const resultado = await db.runAsync(
    `UPDATE labor SET deleted_at = ?, updated_at = ?, pending = 1
     WHERE lote_id = ? AND deleted_at IS NULL`,
    [ahora, ahora, loteId],
  );
  return resultado.changes;
}

/** Cosechas vivas del lote desde `desde` (inclusive): las del ciclo en curso si `desde` es la siembra (D95). */
export function listarCosechasDeLote(
  db: Db,
  loteId: string,
  desde = '',
): Promise<{ fecha: string; cantidad: number }[]> {
  return db.getAllAsync(
    `SELECT fecha, cantidad FROM labor
     WHERE lote_id = ? AND tipo = 'cosecha' AND deleted_at IS NULL AND fecha >= ?
     ORDER BY fecha, id`,
    [loteId, desde],
  );
}

/** Suma de los costos de las labores vivas del lote desde `desde` (inclusive) (D95). */
export async function sumarCostosDeLote(db: Db, loteId: string, desde = ''): Promise<number> {
  const fila = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(costo), 0) AS total FROM labor
     WHERE lote_id = ? AND deleted_at IS NULL AND fecha >= ?`,
    [loteId, desde],
  );
  return fila?.total ?? 0;
}

/**
 * Lo que falta enviar (también las borradas), de la más antigua a la más nueva. Las labores de un lote
 * con aviso esperan: el servidor las rechazaría porque su lote no existe allá.
 */
export function listarLaboresPendientes(db: Db): Promise<LaborFila[]> {
  return db.getAllAsync<LaborFila>(
    `SELECT ${COLUMNAS} FROM labor
     WHERE pending = 1 AND lote_id NOT IN (SELECT id FROM lote WHERE sync_error IS NOT NULL)
       AND NOT (deleted_at IS NULL AND foto_uri IS NOT NULL AND foto_url IS NULL)
     ORDER BY updated_at, id`,
  );
}

/** Da por enviada la labor SOLO si no cambió mientras se enviaba (ver `marcarLoteSincronizado`). */
export async function marcarLaborSincronizada(
  db: Db,
  id: string,
  actualizadoEn: string,
): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE labor SET pending = 0, sync_error = NULL WHERE id = ? AND updated_at = ?',
    [id, actualizadoEn],
  );
  return resultado.changes;
}

export async function marcarLaborConError(
  db: Db,
  id: string,
  actualizadoEn: string,
  mensaje: string,
): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE labor SET sync_error = ? WHERE id = ? AND updated_at = ?',
    [mensaje, id, actualizadoEn],
  );
  return resultado.changes;
}

/**
 * Guarda una labor que llegó del servidor, ya sincronizada. Conserva la foto local (`foto_uri`) y NO
 * pisa un cambio local pendiente: devuelve 0 si lo omitió.
 */
export async function guardarLaborRemota(db: Db, labor: LaborRemota): Promise<number> {
  const resultado = await db.runAsync(
    `INSERT INTO labor (id, lote_id, tipo, fecha, cantidad, unidad, nota, foto_url, luz,
       created_at, updated_at, deleted_at, pending, sync_error, producto, carencia_dias, costo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET lote_id = excluded.lote_id, tipo = excluded.tipo,
       fecha = excluded.fecha, cantidad = excluded.cantidad, unidad = excluded.unidad,
       nota = excluded.nota, foto_url = excluded.foto_url, luz = excluded.luz,
       producto = excluded.producto, carencia_dias = excluded.carencia_dias, costo = excluded.costo,
       created_at = excluded.created_at, updated_at = excluded.updated_at,
       deleted_at = excluded.deleted_at, pending = 0, sync_error = NULL
     WHERE labor.pending = 0`,
    [
      labor.id,
      labor.lote_id,
      labor.tipo,
      labor.fecha,
      labor.cantidad,
      labor.unidad,
      labor.nota,
      labor.foto_url,
      labor.luz,
      labor.created_at,
      labor.updated_at,
      labor.deleted_at,
      labor.producto,
      labor.carencia_dias,
      labor.costo,
    ],
  );
  return resultado.changes;
}

/**
 * Labores vivas con una foto local que todavía no está en el servidor (`foto_uri` sin `foto_url`). Las de un
 * lote con aviso esperan, igual que el resto de sus datos.
 */
export function listarLaboresConFotoPorSubir(db: Db): Promise<LaborFila[]> {
  return db.getAllAsync<LaborFila>(
    `SELECT ${COLUMNAS} FROM labor
     WHERE pending = 1 AND deleted_at IS NULL AND foto_uri IS NOT NULL AND foto_url IS NULL
       AND lote_id NOT IN (SELECT id FROM lote WHERE sync_error IS NOT NULL)
     ORDER BY updated_at, id`,
  );
}

/** Guarda la URL de la foto subida SOLO si la labor no cambió mientras se subía (si cambió, devuelve 0). */
export async function guardarFotoUrl(
  db: Db,
  id: string,
  actualizadoEn: string,
  url: string,
): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE labor SET foto_url = ? WHERE id = ? AND updated_at = ?',
    [url, id, actualizadoEn],
  );
  return resultado.changes;
}

/** Fecha de cada riego vivo de lotes vivos (para calcular el próximo riego de cada lote, D90). */
export function listarRiegosVivos(db: Db): Promise<{ lote_id: string; fecha: string }[]> {
  return db.getAllAsync<{ lote_id: string; fecha: string }>(
    `SELECT labor.lote_id, labor.fecha FROM labor ${DE_LOTES_VIVOS}
     WHERE labor.tipo = 'riego' AND labor.deleted_at IS NULL`,
  );
}
