import { crearAlmacenSesion } from '@/api/almacenSesion';
import { crearClienteApi } from '@/api/cliente';
import { ErrorApi, ErrorDeRed } from '@/api/errores';
import { URL_BASE, llamada, montar, nuevoFetch } from '../helpers/cliente';
import {
  SESION,
  crearClaveValorEnMemoria,
  cuerpoSesion,
  respuesta,
  respuestaSinJson,
} from '../helpers/sesion';

describe('autenticación', () => {
  it('iniciar sesión envía correo y contraseña a /api/auth/login y devuelve la sesión', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, cuerpoSesion()));
    const { cliente } = montar(fetchImpl);

    const sesion = await cliente.iniciarSesion('ana@correo.com', 'clave-segura-1');

    expect(sesion).toEqual({
      token: 'token-nuevo',
      refreshToken: 'refresh-nuevo',
      usuario: { id: 'uid-1', email: 'ana@correo.com' },
    });
    const { url, init, cuerpo } = llamada(fetchImpl, 0);
    expect(url).toBe(`${URL_BASE}/api/auth/login`);
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('application/json');
    expect(cuerpo).toEqual({ email: 'ana@correo.com', password: 'clave-segura-1' });
  });

  it('registrar usa /api/auth/registro', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(201, cuerpoSesion()));
    const { cliente } = montar(fetchImpl);

    await cliente.registrar('ana@correo.com', 'clave-segura-1');

    expect(llamada(fetchImpl, 0).url).toBe(`${URL_BASE}/api/auth/registro`);
  });

  it('una barra final en la URL base no duplica la barra', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, cuerpoSesion()));
    const cliente = crearClienteApi({
      urlBase: `${URL_BASE}/`,
      almacen: crearAlmacenSesion(crearClaveValorEnMemoria()),
      fetchImpl,
    });

    await cliente.iniciarSesion('ana@correo.com', 'clave-segura-1');

    expect(llamada(fetchImpl, 0).url).toBe(`${URL_BASE}/api/auth/login`);
  });

  it('no manda ningún Authorization al iniciar sesión', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, cuerpoSesion()));
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    await cliente.iniciarSesion('ana@correo.com', 'clave-segura-1');

    expect(llamada(fetchImpl, 0).init.headers.authorization).toBeUndefined();
  });

  it.each([
    [401, 'Correo o contraseña incorrectos.'],
    [409, 'Ese correo ya está registrado.'],
    [429, 'Demasiados intentos. Inténtalo más tarde.'],
  ])('un %i de la API llega como ErrorApi con su mensaje', async (status, mensaje) => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(status, { error: mensaje }));
    const { cliente } = montar(fetchImpl);

    const error = await cliente.iniciarSesion('ana@correo.com', 'x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ status, message: mensaje, detalles: [] });
  });

  it('conserva los detalles por campo de un 400', async () => {
    const detalles = [{ campo: 'password', mensaje: 'Mínimo 8 caracteres.' }];
    const fetchImpl = nuevoFetch().mockResolvedValue(
      respuesta(400, { error: 'Datos inválidos', detalles }),
    );
    const { cliente } = montar(fetchImpl);

    const error = await cliente.registrar('ana@correo.com', '123').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 400, detalles });
  });

  it('si el cuerpo del error no es JSON usa un mensaje genérico con el estado', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuestaSinJson(502));
    const { cliente } = montar(fetchImpl);

    const error = await cliente.iniciarSesion('ana@correo.com', 'x').catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 502,
      message: 'El servidor respondió con un error (502).',
    });
  });

  it('un 200 con forma inesperada se trata como error del servidor, no como sesión', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, { token: 'solo-token' }));
    const { cliente } = montar(fetchImpl);

    const error = await cliente.iniciarSesion('ana@correo.com', 'x').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, message: 'Respuesta inesperada del servidor.' });
  });

  it('sin conexión lanza ErrorDeRed', async () => {
    const fetchImpl = nuevoFetch().mockRejectedValue(new TypeError('Network request failed'));
    const { cliente } = montar(fetchImpl);

    const error = await cliente.iniciarSesion('ana@correo.com', 'x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDeRed);
    expect(error).toMatchObject({ message: 'No hay conexión con el servidor.' });
  });
});

describe('tiempo de espera', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('si el servidor no responde en 15 s aborta y lanza ErrorDeRed', async () => {
    const fetchImpl = nuevoFetch().mockImplementation(
      (_url, init) =>
        new Promise((_resolver, rechazar) => {
          init.signal.addEventListener('abort', () => rechazar(new Error('abortado')));
        }),
    );
    const { cliente } = montar(fetchImpl);

    const pendiente = cliente.iniciarSesion('ana@correo.com', 'x').catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(15_000);

    expect(await pendiente).toMatchObject({
      name: 'ErrorDeRed',
      message: 'El servidor tardó demasiado en responder.',
    });
  });
});

describe('recuperar la contraseña (P14)', () => {
  it('envía el correo a /api/auth/recuperar sin token y no devuelve nada', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, { ok: true }));
    const { cliente } = montar(fetchImpl);

    await expect(cliente.recuperarPassword('ana@correo.com')).resolves.toBeUndefined();

    const { url, init, cuerpo } = llamada(fetchImpl, 0);
    expect(url).toBe(`${URL_BASE}/api/auth/recuperar`);
    expect(init.method).toBe('POST');
    expect(init.headers).not.toHaveProperty('authorization');
    expect(cuerpo).toEqual({ email: 'ana@correo.com' });
  });

  it('un 429 llega como ErrorApi con el mensaje de la API', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(
      respuesta(429, { error: 'Demasiados intentos. Inténtalo más tarde.' }),
    );
    const { cliente } = montar(fetchImpl);

    const error = await cliente.recuperarPassword('ana@correo.com').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorApi);
    expect(error).toMatchObject({ status: 429 });
  });

  it('una respuesta con otra forma es un error del servidor (502)', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, { algo: 'raro' }));
    const { cliente } = montar(fetchImpl);

    const error = await cliente.recuperarPassword('ana@correo.com').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502 });
  });
});
