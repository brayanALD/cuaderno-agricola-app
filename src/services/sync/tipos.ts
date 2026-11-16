import type { PeticionApi } from '@/api/cliente';

/** Lo único que la sincronización pide al cliente HTTP: `ClienteApi.pedir` lo cumple. */
export interface ClienteSync {
  readonly pedir: (ruta: string, peticion?: PeticionApi) => Promise<unknown>;
}

/** Máximo de elementos por llamada del `GET` (sección 9.3): una página llena puede tener más detrás. */
export const LIMITE_POR_LLAMADA = 500;

export const CLAVE_ULTIMA_SYNC = 'ultima_sync';
