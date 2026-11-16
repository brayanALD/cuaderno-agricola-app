import { crearAlmacenSesion } from '@/api/almacenSesion';
import { SESION, crearClaveValorEnMemoria } from '../helpers/sesion';

describe('almacén de sesión', () => {
  it('sin nada guardado no hay sesión', async () => {
    const almacen = crearAlmacenSesion(crearClaveValorEnMemoria());

    expect(await almacen.leer()).toBeNull();
  });

  it('lo que se guarda se lee igual', async () => {
    const almacen = crearAlmacenSesion(crearClaveValorEnMemoria());

    await almacen.guardar(SESION);

    expect(await almacen.leer()).toEqual(SESION);
  });

  it('guarda cada valor en su propia clave (un valor grande no comparte el límite de tamaño)', async () => {
    const claveValor = crearClaveValorEnMemoria();

    await crearAlmacenSesion(claveValor).guardar(SESION);

    expect([...claveValor.datos.keys()].sort()).toEqual([
      'sesion.email',
      'sesion.refreshToken',
      'sesion.token',
      'sesion.usuarioId',
    ]);
  });

  it('guardar de nuevo reemplaza los tokens', async () => {
    const almacen = crearAlmacenSesion(crearClaveValorEnMemoria());
    await almacen.guardar(SESION);

    await almacen.guardar({ ...SESION, token: 'otro', refreshToken: 'otro-refresh' });

    expect(await almacen.leer()).toEqual({
      ...SESION,
      token: 'otro',
      refreshToken: 'otro-refresh',
    });
  });

  it('borrar elimina todo y deja de haber sesión', async () => {
    const claveValor = crearClaveValorEnMemoria();
    const almacen = crearAlmacenSesion(claveValor);
    await almacen.guardar(SESION);

    await almacen.borrar();

    expect(await almacen.leer()).toBeNull();
    expect(claveValor.datos.size).toBe(0);
  });

  it.each(['sesion.token', 'sesion.refreshToken', 'sesion.usuarioId', 'sesion.email'])(
    'si falta %s (guardado a medias) no hay sesión en vez de una sesión rota',
    async (clave) => {
      const claveValor = crearClaveValorEnMemoria();
      const almacen = crearAlmacenSesion(claveValor);
      await almacen.guardar(SESION);
      claveValor.datos.delete(clave);

      expect(await almacen.leer()).toBeNull();
    },
  );
});
