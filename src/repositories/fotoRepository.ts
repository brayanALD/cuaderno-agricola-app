import type { Db } from '@/db/tipos';

/** Recuerda una imagen del servidor para borrarla en la próxima sincronización (D85). */
export async function encolarBorradoDeFoto(db: Db, url: string): Promise<void> {
  await db.runAsync('INSERT OR IGNORE INTO fotos_por_borrar (url) VALUES (?)', [url]);
}

/** Encola las imágenes de TODAS las labores vivas de un lote (se borra el lote y sus labores). */
export async function encolarFotosDeLote(db: Db, loteId: string): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO fotos_por_borrar (url)
     SELECT foto_url FROM labor WHERE lote_id = ? AND deleted_at IS NULL AND foto_url IS NOT NULL`,
    [loteId],
  );
}

export async function listarFotosPorBorrar(db: Db): Promise<string[]> {
  const filas = await db.getAllAsync<{ url: string }>(
    'SELECT url FROM fotos_por_borrar ORDER BY url',
  );
  return filas.map((fila) => fila.url);
}

export async function quitarFotoPorBorrar(db: Db, url: string): Promise<void> {
  await db.runAsync('DELETE FROM fotos_por_borrar WHERE url = ?', [url]);
}

export interface FotoRemota {
  readonly id: string;
  readonly foto_url: string | null;
}

/** Ruta de la copia local de la foto aunque la labor esté borrada (para limpiarla al aplicar un cambio remoto). */
export async function leerFotoUri(db: Db, id: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ foto_uri: string | null }>(
    'SELECT foto_uri FROM labor WHERE id = ?',
    [id],
  );
  return fila?.foto_uri ?? null;
}

/** Labores vivas con foto en el servidor pero SIN copia en este teléfono, las más nuevas primero (D97). */
export function listarLaboresSinCopiaLocal(db: Db, limite: number): Promise<FotoRemota[]> {
  return db.getAllAsync<FotoRemota>(
    `SELECT id, foto_url FROM labor
     WHERE deleted_at IS NULL AND foto_url IS NOT NULL AND foto_uri IS NULL
     ORDER BY updated_at DESC, id LIMIT ?`,
    [limite],
  );
}

/**
 * Guarda la ruta de la copia local de una foto remota. NO es un cambio de la labor (no toca `updated_at` ni
 * `pending`) y solo vale si la foto sigue siendo esa: devuelve 0 si la labor cambió o se borró mientras bajaba.
 */
export async function guardarCopiaLocal(
  db: Db,
  id: string,
  url: string,
  uri: string,
): Promise<number> {
  const resultado = await db.runAsync(
    `UPDATE labor SET foto_uri = ?
     WHERE id = ? AND foto_url = ? AND foto_uri IS NULL AND deleted_at IS NULL`,
    [uri, id, url],
  );
  return resultado.changes;
}
