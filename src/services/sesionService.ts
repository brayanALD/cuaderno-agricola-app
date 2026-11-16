import type { AlmacenSesion, SesionGuardada, UsuarioSesion } from '@/api/almacenSesion';
import type { ClienteApi } from '@/api/cliente';
import { ErrorApi, ErrorDeRed } from '@/api/errores';
import { exito, fallo, type Errores, type Resultado } from './resultado';

export interface DatosAcceso {
  readonly email: string;
  readonly password: string;
}

export interface SesionService {
  /** La sesión guardada, sin red: así la app abre sin conexión (D60). `null` = hay que iniciar sesión. */
  readonly restaurar: () => Promise<UsuarioSesion | null>;
  readonly iniciarSesion: (datos: DatosAcceso) => Promise<Resultado<UsuarioSesion>>;
  readonly registrar: (datos: DatosAcceso) => Promise<Resultado<UsuarioSesion>>;
  /** Pide el correo de recuperación (P14). Siempre «bien» si la API responde, exista o no la cuenta. */
  readonly recuperarPassword: (datos: { readonly email: string }) => Promise<Resultado<null>>;
  /** Borra los tokens. Los datos locales del usuario se conservan (D60). */
  readonly cerrarSesion: () => Promise<void>;
  readonly alExpirar: (oyente: () => void) => () => void;
}

export interface DependenciasSesion {
  readonly cliente: Pick<
    ClienteApi,
    'iniciarSesion' | 'registrar' | 'recuperarPassword' | 'alExpirar'
  >;
  readonly almacen: AlmacenSesion;
}

const CAMPOS_DEL_FORMULARIO = new Set(['email', 'password']);

/** Los detalles de un 400 van junto a su campo; lo que no es de un campo, al mensaje general. */
function erroresDeDetalles(error: ErrorApi): Errores {
  if (error.detalles.length === 0) return { general: error.message };
  const errores: Record<string, string> = {};
  for (const { campo, mensaje } of error.detalles) {
    errores[CAMPOS_DEL_FORMULARIO.has(campo) ? campo : 'general'] ??= mensaje;
  }
  return errores;
}

function erroresDeApi(error: ErrorApi): Errores {
  if (error.status >= 500) return { general: 'El servidor tuvo un problema. Inténtalo más tarde.' };
  if (error.status === 409) return { email: error.message };
  if (error.status === 400) return erroresDeDetalles(error);
  return { general: error.message };
}

/** Traduce lo que puede salir mal al acceder. Un fallo del programa (otro tipo de error) NO se disfraza. */
function erroresDeAcceso(error: unknown): Errores {
  if (error instanceof ErrorDeRed) {
    return { general: `${error.message} Revisa tu conexión e inténtalo de nuevo.` };
  }
  if (error instanceof ErrorApi) return erroresDeApi(error);
  throw error;
}

const SIN_ALMACEN = 'No se pudo guardar la sesión de forma segura en este teléfono.';

/** Registro, inicio y cierre de sesión (D60). La API valida; aquí solo se guardan los tokens y se traducen errores. */
export function crearSesionService({ cliente, almacen }: DependenciasSesion): SesionService {
  async function guardar(sesion: SesionGuardada): Promise<Resultado<UsuarioSesion>> {
    try {
      await almacen.guardar(sesion);
    } catch {
      await almacen.borrar().catch(() => undefined);
      return fallo({ general: SIN_ALMACEN });
    }
    return exito(sesion.usuario);
  }

  const acceder =
    (operacion: ClienteApi['iniciarSesion']) =>
    async ({ email, password }: DatosAcceso): Promise<Resultado<UsuarioSesion>> => {
      let sesion: SesionGuardada;
      try {
        sesion = await operacion(email, password);
      } catch (error) {
        return fallo(erroresDeAcceso(error));
      }
      return guardar(sesion);
    };

  return {
    async restaurar() {
      try {
        return (await almacen.leer())?.usuario ?? null;
      } catch {
        // Un almacén ilegible (p. ej. la clave del teléfono cambió) equivale a no tener sesión.
        await almacen.borrar().catch(() => undefined);
        return null;
      }
    },
    async recuperarPassword({ email }) {
      try {
        await cliente.recuperarPassword(email);
      } catch (error) {
        return fallo(erroresDeAcceso(error));
      }
      return exito(null);
    },
    iniciarSesion: acceder(cliente.iniciarSesion),
    registrar: acceder(cliente.registrar),
    cerrarSesion: () => almacen.borrar(),
    alExpirar: (oyente) => cliente.alExpirar(oyente),
  };
}
