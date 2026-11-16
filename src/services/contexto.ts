import type { Db } from '@/db/tipos';
import type { PuertoFotos } from './fotos';
import type { PuertoNotificaciones } from './notificaciones';

/**
 * Todo lo que un servicio necesita del mundo exterior. Inyectarlo (en vez de leer el reloj o
 * generar ids adentro) mantiene las reglas puras y las pruebas deterministas.
 */
export interface Contexto {
  readonly db: Db;
  /** Fotos de las labores: copia permanente local y lectura para subirlas (D83). */
  readonly fotos: PuertoFotos;
  /** Avisos locales del recordatorio de riego (D90). */
  readonly notificaciones: PuertoNotificaciones;
  /** UUID nuevo (D33: `expo-crypto`). */
  readonly nuevoId: () => string;
  /** Instante actual en ISO 8601 UTC con milisegundos. */
  readonly ahora: () => string;
  /** Día de hoy en el calendario local, `AAAA-MM-DD`. */
  readonly hoy: () => string;
}
