import type { Db } from '@/db/tipos';

/** Tablas con control de versión (D96). El nombre sale de este tipo cerrado, nunca de texto del usuario. */
export type TablaVersionada = 'lote' | 'labor';

/**
 * Deja la fila marcada en conflicto con el documento del servidor (JSON) y el aviso. Solo si sigue viva y con
 * cambios sin enviar: devuelve 0 si ya no hay nada que decidir.
 */
export async function guardarConflicto(
  db: Db,
  tabla: TablaVersionada,
  id: string,
  documentoRemoto: string,
  mensaje: string,
): Promise<number> {
  const resultado = await db.runAsync(
    `UPDATE ${tabla} SET conflicto = ?, sync_error = ?
     WHERE id = ? AND pending = 1 AND deleted_at IS NULL`,
    [documentoRemoto, mensaje, id],
  );
  return resultado.changes;
}

export async function leerConflicto(
  db: Db,
  tabla: TablaVersionada,
  id: string,
): Promise<string | null> {
  const fila = await db.getFirstAsync<{ conflicto: string | null }>(
    `SELECT conflicto FROM ${tabla} WHERE id = ? AND deleted_at IS NULL`,
    [id],
  );
  return fila?.conflicto ?? null;
}

/**
 * «Quedarme con la mía»: la fila parte de la versión que tiene ahora el servidor y vuelve a la cola de envío,
 * así que en la próxima sincronización pisa la del otro teléfono a propósito.
 */
export async function conservarLaMia(
  db: Db,
  tabla: TablaVersionada,
  id: string,
  version: string,
  ahora: string,
): Promise<number> {
  const resultado = await db.runAsync(
    `UPDATE ${tabla} SET version_servidor = ?, conflicto = NULL, sync_error = NULL, pending = 1,
       updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    [version, ahora, id],
  );
  return resultado.changes;
}
