import { z } from 'zod';
import type { AlmacenSesion, SesionGuardada } from './almacenSesion';
import { ErrorApi, ErrorDeRed } from './errores';

/** Cuánto se espera una respuesta antes de darla por perdida (el campo suele tener mala señal). */
const TIEMPO_MAXIMO_MS = 15_000;

export interface PeticionHttp {
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string | Uint8Array<ArrayBuffer>;
  readonly signal: AbortSignal;
}

/** Lo único que se lee de la respuesta; `fetch` real la cumple y las pruebas la fabrican fácil. */
export interface RespuestaHttp {
  readonly ok: boolean;
  readonly status: number;
  readonly json: () => Promise<unknown>;
}

export type FetchMinimo = (url: string, init: PeticionHttp) => Promise<RespuestaHttp>;

export interface OpcionesClienteApi {
  /** `EXPO_PUBLIC_API_URL`: solo la dirección pública de la API, nunca un secreto. */
  readonly urlBase: string;
  readonly almacen: AlmacenSesion;
  readonly fetchImpl?: FetchMinimo;
}

/** Cuerpo que no es JSON (los bytes de una foto): se envía tal cual con su `Content-Type`. */
export interface CuerpoBinario {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly tipo: string;
}

export interface PeticionApi {
  readonly metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly cuerpo?: unknown;
  readonly binario?: CuerpoBinario;
}

export interface ClienteApi {
  readonly registrar: (email: string, password: string) => Promise<SesionGuardada>;
  readonly iniciarSesion: (email: string, password: string) => Promise<SesionGuardada>;
  /** Pide el correo para crear una contraseña nueva. La API responde igual exista o no la cuenta (P14). */
  readonly recuperarPassword: (email: string) => Promise<void>;
  /** Petición con el token de la sesión; ante un 401 renueva UNA vez y reintenta (sección 9.1). */
  readonly pedir: (ruta: string, peticion?: PeticionApi) => Promise<unknown>;
  /** Se avisa cuando la renovación es rechazada: la sesión ya no sirve y hay que volver al login. */
  readonly alExpirar: (oyente: () => void) => () => void;
}

const textoNoVacio = z.string().min(1);
const esquemaSesion = z.object({
  token: textoNoVacio,
  refreshToken: textoNoVacio,
  usuario: z.object({ id: textoNoVacio, email: textoNoVacio }),
});
const esquemaOk = z.object({ ok: z.literal(true) });
const esquemaTokens = z.object({ token: textoNoVacio, refreshToken: textoNoVacio });
const esquemaError = z.object({
  error: z.string(),
  detalles: z.array(z.object({ campo: z.string(), mensaje: z.string() })).optional(),
});

interface Respuesta {
  readonly ok: boolean;
  readonly status: number;
  readonly cuerpo: unknown;
}

const MENSAJE_RESPUESTA_INESPERADA = 'Respuesta inesperada del servidor.';
const MENSAJE_SIN_SESION = 'Inicia sesión para continuar.';

/** Una llamada con tiempo máximo. Cualquier fallo antes de tener respuesta es un `ErrorDeRed`. */
async function llamar(fetchImpl: FetchMinimo, url: string, init: Omit<PeticionHttp, 'signal'>) {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS);
  try {
    const respuesta = await fetchImpl(url, { ...init, signal: control.signal });
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    return { ok: respuesta.ok, status: respuesta.status, cuerpo } satisfies Respuesta;
  } catch {
    throw new ErrorDeRed(
      control.signal.aborted
        ? 'El servidor tardó demasiado en responder.'
        : 'No hay conexión con el servidor.',
    );
  } finally {
    clearTimeout(temporizador);
  }
}

/** El error de la API (`{ error, detalles? }`) o, si el cuerpo no tiene esa forma, uno genérico. */
function errorDeRespuesta({ status, cuerpo }: Respuesta): ErrorApi {
  const formato = esquemaError.safeParse(cuerpo);
  if (!formato.success) {
    return new ErrorApi(status, `El servidor respondió con un error (${String(status)}).`);
  }
  return new ErrorApi(status, formato.data.error, formato.data.detalles);
}

/** Cuerpo de una respuesta correcta con la forma esperada; si no, es un error del servidor (502). */
function leerCuerpo<T>(respuesta: Respuesta, esquema: z.ZodType<T>): T {
  if (!respuesta.ok) throw errorDeRespuesta(respuesta);
  const forma = esquema.safeParse(respuesta.cuerpo);
  if (!forma.success) throw new ErrorApi(502, MENSAJE_RESPUESTA_INESPERADA);
  return forma.data;
}

function crearAvisos() {
  const oyentes = new Set<() => void>();
  return {
    suscribir(oyente: () => void) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    avisar() {
      for (const oyente of oyentes) oyente();
    },
  };
}

/** La renovación se rechaza con 401 (token vencido/inválido) o 403 (cuenta deshabilitada). */
const sesionTerminada = (status: number) => status === 401 || status === 403;

type EnviarJson = (
  ruta: string,
  cuerpo: unknown,
  token?: string,
  metodo?: string,
  binario?: CuerpoBinario,
) => Promise<Respuesta>;

/**
 * Renueva el token con el `refreshToken` guardado. Varias peticiones que reciben 401 a la vez esperan
 * la MISMA renovación en vez de lanzar una cada una.
 */
function crearRenovador(
  almacen: AlmacenSesion,
  json: EnviarJson,
  avisos: ReturnType<typeof crearAvisos>,
): () => Promise<string> {
  async function renovar(): Promise<string> {
    const actual = await almacen.leer();
    if (actual === null) throw new ErrorApi(401, MENSAJE_SIN_SESION);
    const respuesta = await json('/api/auth/refresh', { refreshToken: actual.refreshToken });
    if (!respuesta.ok && sesionTerminada(respuesta.status)) {
      await almacen.borrar();
      avisos.avisar();
    }
    const tokens = leerCuerpo(respuesta, esquemaTokens);
    await almacen.guardar({ ...actual, ...tokens });
    return tokens.token;
  }

  let renovacion: Promise<string> | null = null;
  return () => {
    renovacion ??= renovar().finally(() => {
      renovacion = null;
    });
    return renovacion;
  };
}

const tipoDe = (binario: CuerpoBinario | undefined): string =>
  binario === undefined ? 'application/json' : binario.tipo;
const cuerpoJson = (cuerpo: unknown): string | undefined =>
  cuerpo === undefined ? undefined : JSON.stringify(cuerpo);

/**
 * Cliente de la API (sección 9). Guarda su estado en el almacén de sesión, no en memoria, y es el
 * único sitio de la app que llama a `fetch` (las pantallas nunca lo hacen).
 */
export function crearClienteApi({ urlBase, almacen, fetchImpl }: OpcionesClienteApi): ClienteApi {
  const base = urlBase.replace(/\/+$/, '');
  const enviar = fetchImpl ?? fetch;
  const avisos = crearAvisos();

  const json: EnviarJson = (ruta, cuerpo, token, metodo = 'POST', binario) =>
    llamar(enviar, `${base}${ruta}`, {
      method: metodo,
      headers: {
        ...(binario === undefined && cuerpo === undefined
          ? {}
          : { 'content-type': tipoDe(binario) }),
        ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      },
      body: binario === undefined ? cuerpoJson(cuerpo) : binario.bytes,
    });
  const renovarToken = crearRenovador(almacen, json, avisos);

  const autenticar = (ruta: string) => async (email: string, password: string) =>
    leerCuerpo(await json(ruta, { email, password }), esquemaSesion);

  async function pedir(ruta: string, { metodo = 'GET', cuerpo, binario }: PeticionApi = {}) {
    const sesion = await almacen.leer();
    if (sesion === null) throw new ErrorApi(401, MENSAJE_SIN_SESION);
    let respuesta = await json(ruta, cuerpo, sesion.token, metodo, binario);
    if (respuesta.status === 401) {
      respuesta = await json(ruta, cuerpo, await renovarToken(), metodo, binario);
    }
    if (!respuesta.ok) throw errorDeRespuesta(respuesta);
    return respuesta.cuerpo;
  }

  return {
    registrar: autenticar('/api/auth/registro'),
    iniciarSesion: autenticar('/api/auth/login'),
    async recuperarPassword(email) {
      leerCuerpo(await json('/api/auth/recuperar', { email }), esquemaOk);
    },
    pedir,
    alExpirar: avisos.suscribir,
  };
}
