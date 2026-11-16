import { ErrorApi, ErrorDeRed } from '@/api/errores';
import { guardarEstadoSync } from '@/repositories/estadoSyncRepository';
import type { Contexto } from './contexto';
import { enviarPendientes } from './sync/enviar';
import { recibirCambios } from './sync/recibir';
import { CLAVE_ULTIMA_SYNC, type ClienteSync } from './sync/tipos';

export { CLAVE_ULTIMA_SYNC, LIMITE_POR_LLAMADA } from './sync/tipos';
export type { ClienteSync } from './sync/tipos';

export interface ResumenSync {
  /** Cambios locales que el servidor aceptó. */
  readonly enviados: number;
  /** Elementos del servidor que se guardaron en este teléfono. */
  readonly recibidos: number;
  /** Elementos del servidor que no se pudieron guardar (inválidos o con nombre repetido). */
  readonly descartados: number;
  /** Lotes o labores que quedaron con aviso en esta vuelta (D73). */
  readonly conAviso: number;
}

export type ResultadoSync =
  | { readonly ok: true; readonly resumen: ResumenSync }
  | {
      readonly ok: false;
      readonly motivo: 'sin-conexion' | 'sesion' | 'servidor';
      readonly mensaje: string;
    };

const fallo = (motivo: 'sin-conexion' | 'sesion' | 'servidor', mensaje: string): ResultadoSync => ({
  ok: false,
  motivo,
  mensaje,
});

/** Lo que se le dice al usuario cuando la vuelta se corta; un fallo del programa NO se disfraza: se propaga. */
function resultadoDeFallo(error: unknown): ResultadoSync {
  if (error instanceof ErrorDeRed) {
    return fallo('sin-conexion', 'Sin conexión: tus cambios se enviarán cuando vuelva.');
  }
  if (!(error instanceof ErrorApi)) throw error;
  if (error.status === 401) {
    return fallo('sesion', 'Tu sesión ya no es válida. Inicia sesión de nuevo.');
  }
  return fallo(
    'servidor',
    `El servidor no pudo sincronizar ahora (código ${String(error.status)}). Se reintentará.`,
  );
}

/**
 * Una vuelta de sincronización (D71, sección 9.3): PRIMERO se envía lo pendiente (lotes y luego labores)
 * y DESPUÉS se pide lo nuevo con `?since=`. Gana la última escritura que llega al servidor; lo pendiente
 * de este teléfono nunca se pisa al recibir. Si se corta (sin red, sesión, servidor) lo ya enviado
 * queda enviado y el resto sigue pendiente para la próxima vuelta.
 */
export async function sincronizar(ctx: Contexto, cliente: ClienteSync): Promise<ResultadoSync> {
  try {
    const enviado = await enviarPendientes(ctx, cliente);
    const recibido = await recibirCambios(ctx, cliente);
    await guardarEstadoSync(ctx.db, CLAVE_ULTIMA_SYNC, ctx.ahora());
    return {
      ok: true,
      resumen: {
        enviados: enviado.enviados,
        recibidos: recibido.aplicados,
        descartados: recibido.descartados,
        conAviso: enviado.avisos + recibido.avisos,
      },
    };
  } catch (error) {
    return resultadoDeFallo(error);
  }
}
