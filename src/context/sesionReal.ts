import * as SecureStore from 'expo-secure-store';
import { crearAlmacenSesion } from '@/api/almacenSesion';
import { crearClienteApi, type ClienteApi } from '@/api/cliente';
import { leerUrlApi } from '@/api/url';
import { crearSesionService, type SesionService } from '@/services/sesionService';

interface Real {
  readonly cliente: ClienteApi;
  readonly servicio: SesionService;
}

let real: Real | null = null;

/**
 * Raíz de composición de la sesión: tokens en `expo-secure-store` y la API en `EXPO_PUBLIC_API_URL`
 * (la única configuración pública de la app). Una sola instancia para toda la app; solo se prueba en un teléfono.
 */
function crear(): Real {
  const almacen = crearAlmacenSesion(SecureStore);
  const cliente = crearClienteApi({
    urlBase: leerUrlApi(process.env.EXPO_PUBLIC_API_URL),
    almacen,
  });
  return { cliente, servicio: crearSesionService({ cliente, almacen }) };
}

const instancia = (): Real => (real ??= crear());

export const servicioDeSesionReal = (): SesionService => instancia().servicio;

/** El mismo cliente que usa la sesión: así una renovación rechazada cierra la sesión de toda la app. */
export const clienteApiReal = (): ClienteApi => instancia().cliente;
