import type { Db } from '@/db/tipos';

export async function contarLotesVivos(db: Db): Promise<number> {
  const fila = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM lote WHERE deleted_at IS NULL',
  );
  return fila?.total ?? 0;
}

/** Cosechas vivas de lotes vivos con fecha entre `desde` y `hasta` (ambas inclusive), para el resumen (D100). */
export function listarCosechasEntre(
  db: Db,
  desde: string,
  hasta: string,
): Promise<{ fecha: string; cantidad: number }[]> {
  return db.getAllAsync(
    `SELECT labor.fecha, labor.cantidad FROM labor
     INNER JOIN lote ON lote.id = labor.lote_id AND lote.deleted_at IS NULL
     WHERE labor.tipo = 'cosecha' AND labor.deleted_at IS NULL AND labor.fecha BETWEEN ? AND ?`,
    [desde, hasta],
  );
}
