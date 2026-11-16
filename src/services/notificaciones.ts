/** Un aviso que el sistema mostrará en `cuando`, aunque la app esté cerrada. */
export interface AvisoProgramado {
  /** Estable por lote: reprogramar reemplaza el aviso anterior. */
  readonly id: string;
  readonly titulo: string;
  readonly cuerpo: string;
  readonly cuando: Date;
}

/** `sin-preguntar`: aún se puede pedir el permiso; `denegado`: solo se activa en los ajustes del teléfono. */
export type EstadoPermiso = 'concedido' | 'denegado' | 'sin-preguntar';

/**
 * Lo que la app necesita de las notificaciones locales (D90): el adaptador real usa `expo-notifications`;
 * las pruebas, uno en memoria.
 */
export interface PuertoNotificaciones {
  /** Consulta el permiso SIN pedirlo. */
  readonly permiso: () => Promise<EstadoPermiso>;
  /** Pide el permiso (solo cuando el usuario activa los recordatorios y se le explicó para qué). */
  readonly pedirPermiso: () => Promise<EstadoPermiso>;
  /** Cancela todos los avisos programados y programa estos (lista vacía = solo cancela). */
  readonly reemplazarTodos: (avisos: readonly AvisoProgramado[]) => Promise<void>;
}
