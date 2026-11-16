import { crearAlmacenSesion } from '@/api/almacenSesion';
import { crearClienteApi } from '@/api/cliente';
import { ErrorDeRed } from '@/api/errores';
import { URL_BASE, llamada, montar, nuevoFetch } from '../helpers/cliente';
import { SESION, crearClaveValorEnMemoria, respuesta } from '../helpers/sesion';

describe('peticiones con sesión', () => {
  it('manda el token guardado como Bearer y devuelve el JSON', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, { items: [] }));
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const cuerpo = await cliente.pedir('/api/lotes');

    expect(cuerpo).toEqual({ items: [] });
    const { url, init } = llamada(fetchImpl, 0);
    expect(url).toBe(`${URL_BASE}/api/lotes`);
    expect(init.method).toBe('GET');
    expect(init.headers.authorization).toBe('Bearer token-1');
  });

  it('envía el cuerpo como JSON', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(200, {}));
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    await cliente.pedir('/api/lotes/abc', { metodo: 'PUT', cuerpo: { nombre: 'El Mirador' } });

    const { init, cuerpo } = llamada(fetchImpl, 0);
    expect(init.method).toBe('PUT');
    expect(init.headers['content-type']).toBe('application/json');
    expect(cuerpo).toEqual({ nombre: 'El Mirador' });
  });

  it('sin sesión guardada responde 401 sin llamar a la red', async () => {
    const fetchImpl = nuevoFetch();
    const { cliente } = montar(fetchImpl);

    const error = await cliente.pedir('/api/lotes').catch((e: unknown) => e);

    expect(error).toMatchObject({ name: 'ErrorApi', status: 401 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('un error que no es 401 se lanza tal cual y no toca la sesión', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(respuesta(404, { error: 'No encontrado' }));
    const { cliente, almacen, alExpirar } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const error = await cliente.pedir('/api/lotes/x/produccion').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 404, message: 'No encontrado' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(await almacen.leer()).toEqual(SESION);
    expect(alExpirar).not.toHaveBeenCalled();
  });
});

describe('renovación del token (una sola vez)', () => {
  const rechazado = respuesta(401, { error: 'No autenticado' });
  const renovada = respuesta(200, {
    token: 'token-renovado',
    refreshToken: 'refresh-renovado',
    expiraEnSeg: 3600,
  });

  it('ante un 401 renueva con el refreshToken, guarda los tokens nuevos y reintenta', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(rechazado)
      .mockResolvedValueOnce(renovada)
      .mockResolvedValueOnce(respuesta(200, { ok: true }));
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const cuerpo = await cliente.pedir('/api/lotes');

    expect(cuerpo).toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const refresco = llamada(fetchImpl, 1);
    expect(refresco.url).toBe(`${URL_BASE}/api/auth/refresh`);
    expect(refresco.init.method).toBe('POST');
    expect(refresco.init.headers.authorization).toBeUndefined();
    expect(refresco.cuerpo).toEqual({ refreshToken: 'refresh-1' });
    expect(llamada(fetchImpl, 2).init.headers.authorization).toBe('Bearer token-renovado');
    expect(await almacen.leer()).toEqual({
      token: 'token-renovado',
      refreshToken: 'refresh-renovado',
      usuario: SESION.usuario,
    });
  });

  it('si la renovación es rechazada (401) borra la sesión y avisa de que expiró', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(rechazado)
      .mockResolvedValueOnce(
        respuesta(401, { error: 'La sesión expiró. Inicia sesión de nuevo.' }),
      );
    const { cliente, almacen, alExpirar } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const error = await cliente.pedir('/api/lotes').catch((e: unknown) => e);

    expect(error).toMatchObject({
      status: 401,
      message: 'La sesión expiró. Inicia sesión de nuevo.',
    });
    expect(await almacen.leer()).toBeNull();
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('una cuenta deshabilitada (403 al renovar) también cierra la sesión', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(rechazado)
      .mockResolvedValueOnce(respuesta(403, { error: 'La cuenta está deshabilitada.' }));
    const { cliente, almacen, alExpirar } = montar(fetchImpl);
    await almacen.guardar(SESION);

    await cliente.pedir('/api/lotes').catch(() => undefined);

    expect(await almacen.leer()).toBeNull();
    expect(alExpirar).toHaveBeenCalledTimes(1);
  });

  it('sin conexión al renovar NO cierra la sesión (se podrá reintentar luego)', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(rechazado)
      .mockRejectedValueOnce(new TypeError('Network request failed'));
    const { cliente, almacen, alExpirar } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const error = await cliente.pedir('/api/lotes').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ErrorDeRed);
    expect(await almacen.leer()).toEqual(SESION);
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('un 429 o 500 al renovar no cierra la sesión', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(rechazado)
      .mockResolvedValueOnce(respuesta(500, { error: 'Error interno' }));
    const { cliente, almacen, alExpirar } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const error = await cliente.pedir('/api/lotes').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 500 });
    expect(await almacen.leer()).toEqual(SESION);
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('si tras renovar sigue el 401 no vuelve a intentarlo (nada de bucles) ni cierra la sesión', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(rechazado)
      .mockResolvedValueOnce(renovada)
      .mockResolvedValueOnce(rechazado);
    const { cliente, almacen, alExpirar } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const error = await cliente.pedir('/api/lotes').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(alExpirar).not.toHaveBeenCalled();
  });

  it('una respuesta de renovación con forma inesperada es un error del servidor y conserva la sesión', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(rechazado)
      .mockResolvedValueOnce(respuesta(200, { token: 'solo-token' }));
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const error = await cliente.pedir('/api/lotes').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 502, message: 'Respuesta inesperada del servidor.' });
    expect(await almacen.leer()).toEqual(SESION);
  });

  it('varias peticiones que fallan a la vez comparten UNA sola renovación', async () => {
    const fetchImpl = nuevoFetch().mockImplementation((url, init) => {
      if (url.endsWith('/api/auth/refresh')) return Promise.resolve(renovada);
      const bueno = init.headers.authorization === 'Bearer token-renovado';
      return Promise.resolve(bueno ? respuesta(200, { ok: url }) : rechazado);
    });
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const resultados = await Promise.all([
      cliente.pedir('/api/lotes'),
      cliente.pedir('/api/labores'),
      cliente.pedir('/api/lotes/x/produccion'),
    ]);

    expect(resultados).toHaveLength(3);
    const renovaciones = fetchImpl.mock.calls.filter(([url]) => url.endsWith('/api/auth/refresh'));
    expect(renovaciones).toHaveLength(1);
  });

  it('si cierran la sesión mientras se renovaba, responde 401 sin llamar a la red', async () => {
    const claveValor = crearClaveValorEnMemoria();
    const almacen = crearAlmacenSesion(claveValor);
    await almacen.guardar(SESION);
    const fetchImpl = nuevoFetch().mockImplementationOnce(async () => {
      await almacen.borrar();
      return rechazado;
    });
    const cliente = crearClienteApi({ urlBase: URL_BASE, almacen, fetchImpl });

    const error = await cliente.pedir('/api/lotes').catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('aviso de sesión expirada', () => {
  it('quien se suscribe deja de recibir avisos al darse de baja', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(respuesta(401, { error: 'No autenticado' }))
      .mockResolvedValueOnce(
        respuesta(401, { error: 'La sesión expiró. Inicia sesión de nuevo.' }),
      );
    const { cliente, almacen } = montar(fetchImpl);
    const otro = jest.fn();
    const darDeBaja = cliente.alExpirar(otro);
    darDeBaja();
    await almacen.guardar(SESION);

    await cliente.pedir('/api/lotes').catch(() => undefined);

    expect(otro).not.toHaveBeenCalled();
  });
});
