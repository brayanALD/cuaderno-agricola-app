import * as Network from 'expo-network';
import type { MonitorRed } from '@/services/red';

/** Hay internet si hay red y, cuando Android lo confirma, si es alcanzable (D72). */
const estaEnLinea = (estado: Network.NetworkState): boolean =>
  estado.isConnected === true && estado.isInternetReachable !== false;

/** Adaptador real de `MonitorRed` con `expo-network`. Solo se prueba en un teléfono. */
export const redReal: MonitorRed = {
  actual: async () => estaEnLinea(await Network.getNetworkStateAsync()),
  suscribir: (oyente) => {
    const suscripcion = Network.addNetworkStateListener((estado) => oyente(estaEnLinea(estado)));
    return () => suscripcion.remove();
  },
};
