import { ErrorApi } from '@/api/errores';

export type Entidad = 'lote' | 'labor';

export const MENSAJE_NOMBRE_REPETIDO =
  'Ya existe otro lote con ese nombre en tu cuenta (quizá lo creaste en otro dispositivo). Cámbiale el nombre para sincronizarlo.';

/** Un 401, un 429 o un 5xx no son culpa de UNA fila: cortan la vuelta entera. */
const esGeneral = (error: ErrorApi): boolean =>
  error.status === 401 || error.status === 429 || error.status >= 500;

/**
 * El aviso que se guarda junto a un lote o una labor que el servidor rechazó (D73). Si el error NO es
 * de esa fila (sin red, sesión, servidor caído o un fallo del programa) se vuelve a lanzar.
 */
export function mensajeDeFila(error: unknown, entidad: Entidad): string {
  if (!(error instanceof ErrorApi) || esGeneral(error)) throw error;
  if (entidad === 'lote' && error.status === 409) return MENSAJE_NOMBRE_REPETIDO;
  const rechazo = entidad === 'lote' ? 'El servidor lo rechazó' : 'El servidor la rechazó';
  const detalle = error.status === 400 ? error.detalles[0]?.mensaje : undefined;
  return detalle === undefined
    ? `${rechazo} (código ${String(error.status)}).`
    : `${rechazo}: ${detalle}`;
}
