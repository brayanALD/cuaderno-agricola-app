import type {
  AvisoProgramado,
  EstadoPermiso,
  PuertoNotificaciones,
} from '@/services/notificaciones';

export interface NotificacionesEnMemoria extends PuertoNotificaciones {
  /** Avisos programados ahora mismo. */
  programados: readonly AvisoProgramado[];
  /** Estado del permiso; `pedirPermiso` lo pasa a `respuestaAlPedir`. */
  estado: EstadoPermiso;
  respuestaAlPedir: EstadoPermiso;
  vecesPedido: number;
}

/** Notificaciones de mentira para las pruebas: guardan lo programado y simulan el permiso. */
export function crearNotificacionesEnMemoria(
  estado: EstadoPermiso = 'concedido',
): NotificacionesEnMemoria {
  const notificaciones: NotificacionesEnMemoria = {
    programados: [],
    estado,
    respuestaAlPedir: 'concedido',
    vecesPedido: 0,
    permiso: () => Promise.resolve(notificaciones.estado),
    pedirPermiso: () => {
      notificaciones.vecesPedido += 1;
      notificaciones.estado = notificaciones.respuestaAlPedir;
      return Promise.resolve(notificaciones.estado);
    },
    reemplazarTodos: (avisos) => {
      notificaciones.programados = [...avisos];
      return Promise.resolve();
    },
  };
  return notificaciones;
}
