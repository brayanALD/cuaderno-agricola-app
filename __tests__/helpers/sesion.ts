import type { AlmacenClaveValor, SesionGuardada } from '@/api/almacenSesion';
import type { RespuestaHttp } from '@/api/cliente';

export const SESION: SesionGuardada = {
  token: 'token-1',
  refreshToken: 'refresh-1',
  usuario: { id: 'uid-1', email: 'ana@correo.com' },
};

/** Clave-valor en memoria que hace de `expo-secure-store`; `datos` deja ver qué quedó guardado. */
export function crearClaveValorEnMemoria(): AlmacenClaveValor & {
  readonly datos: Map<string, string>;
} {
  const datos = new Map<string, string>();
  return {
    datos,
    getItemAsync: (clave) => Promise.resolve(datos.get(clave) ?? null),
    setItemAsync: (clave, valor) => {
      datos.set(clave, valor);
      return Promise.resolve();
    },
    deleteItemAsync: (clave) => {
      datos.delete(clave);
      return Promise.resolve();
    },
  };
}

/** Respuesta HTTP mínima: lo único que el cliente lee es `ok`, `status` y `json()`. */
export function respuesta(status: number, cuerpo: unknown): RespuestaHttp {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(cuerpo) };
}

/** Respuesta cuyo cuerpo no es JSON (p. ej. la página de error de un proxy). */
export function respuestaSinJson(status: number): RespuestaHttp {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.reject(new SyntaxError('Unexpected token <')),
  };
}

export const cuerpoSesion = (cambios: Record<string, unknown> = {}) => ({
  token: 'token-nuevo',
  refreshToken: 'refresh-nuevo',
  expiraEnSeg: 3600,
  usuario: { id: 'uid-1', email: 'ana@correo.com' },
  ...cambios,
});
