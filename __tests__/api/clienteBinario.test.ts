import { montar, nuevoFetch, llamada } from '../helpers/cliente';
import { SESION, respuesta } from '../helpers/sesion';

const BYTES = new Uint8Array([255, 216, 255, 224, 1, 2, 3]);

describe('pedir con cuerpo binario (subida de fotos, D83–D85)', () => {
  it('envía los bytes tal cual, con su Content-Type y el Bearer, sin convertirlos a JSON', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(
      respuesta(201, { url: 'https://blob.example/a.jpg', pathname: 'usuarios/u/a.jpg' }),
    );
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const cuerpo = await cliente.pedir('/api/imagenes', {
      metodo: 'POST',
      binario: { bytes: BYTES, tipo: 'image/jpeg' },
    });

    expect(cuerpo).toEqual({ url: 'https://blob.example/a.jpg', pathname: 'usuarios/u/a.jpg' });
    const { init } = llamada(fetchImpl, 0);
    expect(init.method).toBe('POST');
    expect(init.headers['content-type']).toBe('image/jpeg');
    expect(init.headers.authorization).toBe('Bearer token-1');
    expect(init.body).toBe(BYTES);
  });

  it('ante un 401 renueva el token una vez y reenvía los MISMOS bytes', async () => {
    const fetchImpl = nuevoFetch()
      .mockResolvedValueOnce(respuesta(401, { error: 'No autenticado' }))
      .mockResolvedValueOnce(
        respuesta(200, { token: 'token-renovado', refreshToken: 'refresh-renovado' }),
      )
      .mockResolvedValueOnce(respuesta(201, { url: 'https://blob.example/b.jpg', pathname: 'p' }));
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    await cliente.pedir('/api/imagenes', {
      metodo: 'POST',
      binario: { bytes: BYTES, tipo: 'image/jpeg' },
    });

    const segundoIntento = llamada(fetchImpl, 2);
    expect(segundoIntento.init.body).toBe(BYTES);
    expect(segundoIntento.init.headers.authorization).toBe('Bearer token-renovado');
    expect(llamada(fetchImpl, 1).url).toContain('/api/auth/refresh');
  });

  it('un 413 llega como error de la API con su mensaje', async () => {
    const fetchImpl = nuevoFetch().mockResolvedValue(
      respuesta(413, { error: 'La imagen pesa más de 4 MB' }),
    );
    const { cliente, almacen } = montar(fetchImpl);
    await almacen.guardar(SESION);

    const error = await cliente
      .pedir('/api/imagenes', { metodo: 'POST', binario: { bytes: BYTES, tipo: 'image/jpeg' } })
      .catch((e: unknown) => e);

    expect(error).toMatchObject({ status: 413, message: 'La imagen pesa más de 4 MB' });
  });
});
