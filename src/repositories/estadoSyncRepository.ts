import type { Db } from '@/db/tipos';

export async function leerEstadoSync(db: Db, clave: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM sync_estado WHERE clave = ?',
    [clave],
  );
  return fila?.valor ?? null;
}

export async function guardarEstadoSync(db: Db, clave: string, valor: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_estado (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [clave, valor],
  );
}

export interface ConteoSync {
  /** Cambios que faltan enviar (también borrados). */
  readonly pendientes: number;
  /** Lotes y labores vivos que el servidor rechazó y esperan que el usuario los arregle (D73). */
  readonly conAviso: number;
}

export async function contarSync(db: Db): Promise<ConteoSync> {
  const fila = await db.getFirstAsync<ConteoSync>(
    `SELECT
       (SELECT COUNT(*) FROM lote WHERE pending = 1) + (SELECT COUNT(*) FROM labor WHERE pending = 1)
         AS pendientes,
       (SELECT COUNT(*) FROM lote WHERE sync_error IS NOT NULL AND deleted_at IS NULL) +
       (SELECT COUNT(*) FROM labor WHERE sync_error IS NOT NULL AND deleted_at IS NULL)
         AS conAviso`,
  );
  return { pendientes: fila?.pendientes ?? 0, conAviso: fila?.conAviso ?? 0 };
}
