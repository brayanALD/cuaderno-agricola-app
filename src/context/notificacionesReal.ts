import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
  SchedulableTriggerInputTypes,
  type NotificationPermissionsStatus,
} from 'expo-notifications';
import type { EstadoPermiso, PuertoNotificaciones } from '@/services/notificaciones';

const CANAL = 'riego';

/**
 * Canal de Android (obligatorio desde Android 8; en Android 13+ debe existir ANTES de pedir el permiso) y
 * manejador para que el aviso también se vea con la app abierta. Se hace una sola vez.
 */
let preparado: Promise<void> | null = null;
function preparar(): Promise<void> {
  preparado ??= (async () => {
    setNotificationHandler({
      handleNotification: () =>
        Promise.resolve({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
    });
    // Si el sistema no deja crear el canal (p. ej. con las notificaciones bloqueadas) no es fatal: expo
    // programa en su canal por defecto y el permiso se evalúa aparte.
    await setNotificationChannelAsync(CANAL, {
      name: 'Recordatorio de riego',
      importance: AndroidImportance.DEFAULT,
    }).catch(() => null);
  })();
  return preparado;
}

function aEstado(permisos: NotificationPermissionsStatus): EstadoPermiso {
  if (permisos.granted) return 'concedido';
  return permisos.canAskAgain ? 'sin-preguntar' : 'denegado';
}

/**
 * Adaptador real de `PuertoNotificaciones` con `expo-notifications` (avisos locales, sin servidor de
 * push). Solo se prueba en un teléfono (D90).
 */
export const notificacionesReal: PuertoNotificaciones = {
  async permiso() {
    return aEstado(await getPermissionsAsync());
  },
  async pedirPermiso() {
    await preparar();
    return aEstado(await requestPermissionsAsync());
  },
  async reemplazarTodos(avisos) {
    await preparar();
    await cancelAllScheduledNotificationsAsync();
    for (const aviso of avisos) {
      await scheduleNotificationAsync({
        identifier: aviso.id,
        content: { title: aviso.titulo, body: aviso.cuerpo },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: aviso.cuando, channelId: CANAL },
      });
    }
  },
};
