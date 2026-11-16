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
