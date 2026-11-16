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

/** Un lote o una labor que falta enviar, tal como está en la base (D105). */
export interface FilaPendiente {
  readonly clase: 'lote' | 'labor';
  readonly id: string;
  /** Nombre del lote (de la propia fila o del lote al que pertenece la labor). */
  readonly lote: string;
  /** Tipo de la labor (`null` si es un lote). */
  readonly tipo_labor: string | null;
  /** Fecha de la labor (`null` si es un lote). */
  readonly fecha: string | null;
  readonly borrado: 0 | 1;
  readonly aviso: string | null;
  readonly conflicto: 0 | 1;
}

/** Lo que falta enviar, con lo que tiene aviso primero; recorta a `limite` para no cargar de más. */
export async function listarPendientes(db: Db, limite: number): Promise<FilaPendiente[]> {
  return db.getAllAsync<FilaPendiente>(
    `SELECT * FROM (
       SELECT 'lote' AS clase, id, nombre AS lote, NULL AS tipo_labor, NULL AS fecha,
              deleted_at IS NOT NULL AS borrado, sync_error AS aviso, conflicto IS NOT NULL AS conflicto
         FROM lote WHERE pending = 1
       UNION ALL
       SELECT 'labor', l.id, o.nombre, l.tipo, l.fecha,
              l.deleted_at IS NOT NULL, l.sync_error, l.conflicto IS NOT NULL
         FROM labor l JOIN lote o ON o.id = l.lote_id WHERE l.pending = 1
     ) ORDER BY (aviso IS NULL), conflicto DESC, fecha DESC LIMIT ?`,
    [limite],
  );
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
