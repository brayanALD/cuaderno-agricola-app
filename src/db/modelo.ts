export const TIPOS_LABOR = ['riego', 'abono', 'fumigacion', 'poda', 'cosecha'] as const;
export type TipoLabor = (typeof TIPOS_LABOR)[number];

export const LUCES = ['soleado', 'nublado'] as const;
export type Luz = (typeof LUCES)[number];

/**
 * Campos de sincronización comunes (D32): fechas en ISO 8601 UTC, `pending` 1 = falta enviar y
 * `sync_error` = por qué el servidor no lo aceptó (D73); con aviso, la fila sigue pendiente.
 */
interface FilaBase {
  readonly id: string;
  readonly created_at: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
  readonly pending: 0 | 1;
  readonly sync_error: string | null;
}

export interface LoteFila extends FilaBase {
  readonly nombre: string;
  readonly cultivo: string;
  readonly area_m2: number;
  readonly altitud_m: number | null;
  readonly lat: number | null;
  readonly lng: number | null;
  readonly fecha_siembra: string;
}

export interface LaborFila extends FilaBase {
  readonly lote_id: string;
  readonly tipo: TipoLabor;
  readonly fecha: string;
  readonly cantidad: number;
  readonly unidad: string | null;
  readonly nota: string | null;
  readonly foto_uri: string | null;
  readonly foto_url: string | null;
  readonly luz: Luz | null;
}

/** Lo que el servidor devuelve de un lote: la fila sin las marcas locales de sincronización. */
export type LoteRemoto = Omit<LoteFila, 'pending' | 'sync_error'>;

/** Y de una labor; la foto local (`foto_uri`) nunca viaja ni se pisa. */
export type LaborRemota = Omit<LaborFila, 'pending' | 'sync_error' | 'foto_uri'>;
