import type { CicloFila, CicloRemoto } from '@/db/modelo';
import type { Db } from '@/db/tipos';

const CAMPOS = [
  'id',
  'lote_id',
  'cultivo',
  'fecha_inicio',
  'fecha_fin',
  'total_kg',
  'created_at',
  'updated_at',
  'deleted_at',
  'pending',
  'sync_error',
] as const;
const COLUMNAS = CAMPOS.join(', ');

export async function insertarCiclo(db: Db, ciclo: CicloFila): Promise<void> {
  await db.runAsync(
    `INSERT INTO ciclo (${COLUMNAS}) VALUES (${CAMPOS.map(() => '?').join(', ')})`,
    CAMPOS.map((campo) => ciclo[campo]),
  );
}

/** Ciclos cerrados vivos de un lote, del más reciente al más antiguo. */
export function listarCiclosDeLote(db: Db, loteId: string): Promise<CicloFila[]> {
  return db.getAllAsync<CicloFila>(
    `SELECT ${COLUMNAS} FROM ciclo WHERE lote_id = ? AND deleted_at IS NULL
     ORDER BY fecha_fin DESC, id`,
    [loteId],
  );
}

/** Parte del borrado lógico en cascada de un lote (D40). */
export async function marcarCiclosDeLoteBorrados(
  db: Db,
  loteId: string,
  ahora: string,
): Promise<number> {
  const resultado = await db.runAsync(
    `UPDATE ciclo SET deleted_at = ?, updated_at = ?, pending = 1
     WHERE lote_id = ? AND deleted_at IS NULL`,
    [ahora, ahora, loteId],
  );
  return resultado.changes;
}

/** Lo que falta enviar. Los ciclos de un lote con aviso esperan, igual que sus labores. */
export function listarCiclosPendientes(db: Db): Promise<CicloFila[]> {
  return db.getAllAsync<CicloFila>(
    `SELECT ${COLUMNAS} FROM ciclo
     WHERE pending = 1 AND lote_id NOT IN (SELECT id FROM lote WHERE sync_error IS NOT NULL)
     ORDER BY updated_at, id`,
  );
}

/** Da por enviado el ciclo solo si no cambió mientras se enviaba. */
export async function marcarCicloSincronizado(
  db: Db,
  id: string,
  actualizadoEn: string,
): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE ciclo SET pending = 0, sync_error = NULL WHERE id = ? AND updated_at = ?',
    [id, actualizadoEn],
  );
  return resultado.changes;
}

export async function marcarCicloConError(
  db: Db,
  id: string,
  actualizadoEn: string,
  mensaje: string,
): Promise<number> {
  const resultado = await db.runAsync(
    'UPDATE ciclo SET sync_error = ? WHERE id = ? AND updated_at = ?',
    [mensaje, id, actualizadoEn],
  );
  return resultado.changes;
}

/** Guarda un ciclo que llegó del servidor; no pisa un cambio local pendiente (devuelve 0 si lo omitió). */
export async function guardarCicloRemoto(db: Db, ciclo: CicloRemoto): Promise<number> {
  const resultado = await db.runAsync(
    `INSERT INTO ciclo (${COLUMNAS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)
     ON CONFLICT(id) DO UPDATE SET lote_id = excluded.lote_id, cultivo = excluded.cultivo,
       fecha_inicio = excluded.fecha_inicio, fecha_fin = excluded.fecha_fin,
       total_kg = excluded.total_kg, created_at = excluded.created_at,
       updated_at = excluded.updated_at, deleted_at = excluded.deleted_at, pending = 0,
       sync_error = NULL
     WHERE ciclo.pending = 0`,
    [
      ciclo.id,
      ciclo.lote_id,
      ciclo.cultivo,
      ciclo.fecha_inicio,
      ciclo.fecha_fin,
      ciclo.total_kg,
      ciclo.created_at,
      ciclo.updated_at,
      ciclo.deleted_at,
    ],
  );
  return resultado.changes;
}
