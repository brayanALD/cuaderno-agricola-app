import { crearAlmacenSesion } from '@/api/almacenSesion';
import { ErrorApi, ErrorDeRed } from '@/api/errores';
import { crearSesionService } from '@/services/sesionService';
import { SESION, crearClaveValorEnMemoria } from '../helpers/sesion';

const DATOS = { email: 'ana@correo.com', password: 'clave-segura-1' };

function montar() {
  const claveValor = crearClaveValorEnMemoria();
  const almacen = crearAlmacenSesion(claveValor);
  const cliente = {
    iniciarSesion: jest.fn(),
    registrar: jest.fn(),
    recuperarPassword: jest.fn(),
    alExpirar: jest.fn().mockReturnValue(() => undefined),
  };
  const servicio = crearSesionService({ cliente, almacen });
  return { servicio, cliente, almacen, claveValor };
}

describe('restaurar la sesión al abrir la app', () => {
  it('con una sesión guardada devuelve el usuario sin llamar a la red (la app abre sin conexión)', async () => {
    const { servicio, cliente, almacen } = montar();
    await almacen.guardar(SESION);

    expect(await servicio.restaurar()).toEqual(SESION.usuario);
    expect(cliente.iniciarSesion).not.toHaveBeenCalled();
  });

  it('sin sesión guardada devuelve null', async () => {
    const { servicio } = montar();

    expect(await servicio.restaurar()).toBeNull();
  });

  it('si el almacén seguro no se puede leer (p. ej. clave perdida) empieza sin sesión y limpia lo guardado', async () => {
    const { servicio, claveValor } = montar();
    claveValor.datos.set('sesion.token', 'x');
    const lectura = jest
      .spyOn(claveValor, 'getItemAsync')
      .mockRejectedValue(new Error('Could not decrypt'));

    expect(await servicio.restaurar()).toBeNull();
    expect(claveValor.datos.size).toBe(0);
    lectura.mockRestore();
  });
});

describe.each([
  ['iniciarSesion', 'iniciarSesion'],
  ['registrar', 'registrar'],
] as const)('%s', (metodo, llamadaApi) => {
  it('si sale bien guarda la sesión y devuelve el usuario', async () => {
    const { servicio, cliente, almacen } = montar();
    cliente[llamadaApi].mockResolvedValue(SESION);

    const resultado = await servicio[metodo](DATOS);

    expect(resultado).toEqual({ ok: true, valor: SESION.usuario });
    expect(cliente[llamadaApi]).toHaveBeenCalledWith('ana@correo.com', 'clave-segura-1');
    expect(await almacen.leer()).toEqual(SESION);
  });

  it('sin conexión explica qué pasó y no guarda nada', async () => {
    const { servicio, cliente, almacen } = montar();
    cliente[llamadaApi].mockRejectedValue(new ErrorDeRed('No hay conexión con el servidor.'));

    const resultado = await servicio[metodo](DATOS);

    expect(resultado).toEqual({
      ok: false,
      errores: {
        general: 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      },
    });
    expect(await almacen.leer()).toBeNull();
  });

  it.each([
    [401, 'Correo o contraseña incorrectos.'],
    [403, 'La cuenta está deshabilitada.'],
    [429, 'Demasiados intentos. Inténtalo más tarde.'],
  ])('un %i muestra el mensaje de la API como error general', async (status, mensaje) => {
    const { servicio, cliente } = montar();
    cliente[llamadaApi].mockRejectedValue(new ErrorApi(status, mensaje));

    expect(await servicio[metodo](DATOS)).toEqual({ ok: false, errores: { general: mensaje } });
  });

  it('un error 5xx no enseña el texto técnico del servidor', async () => {
    const { servicio, cliente } = montar();
    cliente[llamadaApi].mockRejectedValue(new ErrorApi(500, 'Error interno'));

    expect(await servicio[metodo](DATOS)).toEqual({
      ok: false,
      errores: { general: 'El servidor tuvo un problema. Inténtalo más tarde.' },
    });
  });

  it('los detalles de un 400 van a su campo y lo demás al error general', async () => {
    const { servicio, cliente } = montar();
    cliente[llamadaApi].mockRejectedValue(
      new ErrorApi(400, 'Datos inválidos', [
        { campo: 'email', mensaje: 'Escribe un correo válido.' },
        { campo: 'password', mensaje: 'Mínimo 8 caracteres.' },
        { campo: 'cuerpo', mensaje: 'Falta el cuerpo.' },
      ]),
    );

    expect(await servicio[metodo](DATOS)).toEqual({
      ok: false,
      errores: {
        email: 'Escribe un correo válido.',
        password: 'Mínimo 8 caracteres.',
        general: 'Falta el cuerpo.',
      },
    });
  });

  it('un 400 sin detalles usa el mensaje de la API', async () => {
    const { servicio, cliente } = montar();
    cliente[llamadaApi].mockRejectedValue(new ErrorApi(400, 'La contraseña es demasiado débil.'));

    expect(await servicio[metodo](DATOS)).toEqual({
      ok: false,
      errores: { general: 'La contraseña es demasiado débil.' },
    });
  });

  it('si el almacén seguro falla al guardar lo dice y no deja sesión a medias', async () => {
    const { servicio, cliente, claveValor, almacen } = montar();
    cliente[llamadaApi].mockResolvedValue(SESION);
    jest.spyOn(claveValor, 'setItemAsync').mockRejectedValue(new Error('Keystore error'));

    const resultado = await servicio[metodo](DATOS);

    expect(resultado).toEqual({
      ok: false,
      errores: { general: 'No se pudo guardar la sesión de forma segura en este teléfono.' },
    });
    expect(await almacen.leer()).toBeNull();
  });

  it('un error que no es de la API ni de red (un fallo del programa) no se disfraza: se propaga', async () => {
    const { servicio, cliente } = montar();
    cliente[llamadaApi].mockRejectedValue(new TypeError('x is not a function'));

    await expect(servicio[metodo](DATOS)).rejects.toThrow('x is not a function');
  });
});

describe('registrar: correo repetido', () => {
  it('un 409 se muestra en el campo del correo', async () => {
    const { servicio, cliente } = montar();
    cliente.registrar.mockRejectedValue(new ErrorApi(409, 'Ese correo ya está registrado.'));

    expect(await servicio.registrar(DATOS)).toEqual({
      ok: false,
      errores: { email: 'Ese correo ya está registrado.' },
    });
  });
});

describe('cerrar sesión', () => {
  it('borra los tokens y la sesión; los datos locales no se tocan (D60)', async () => {
    const { servicio, almacen } = montar();
    await almacen.guardar(SESION);

    await servicio.cerrarSesion();

    expect(await almacen.leer()).toBeNull();
    expect(await servicio.restaurar()).toBeNull();
  });
});

describe('sesión expirada', () => {
  it('reenvía la suscripción del cliente y su baja', () => {
    const { servicio, cliente } = montar();
    const baja = jest.fn();
    cliente.alExpirar.mockReturnValue(baja);
    const oyente = jest.fn();

    const darDeBaja = servicio.alExpirar(oyente);
    darDeBaja();

    expect(cliente.alExpirar).toHaveBeenCalledWith(oyente);
    expect(baja).toHaveBeenCalledTimes(1);
  });
});

describe('recuperarPassword (P14)', () => {
  it('si la API responde bien devuelve ok y no toca la sesión guardada', async () => {
    const { servicio, cliente, almacen } = montar();
    cliente.recuperarPassword.mockResolvedValue(undefined);

    const resultado = await servicio.recuperarPassword({ email: 'ana@correo.com' });

    expect(resultado).toEqual({ ok: true, valor: null });
    expect(cliente.recuperarPassword).toHaveBeenCalledWith('ana@correo.com');
    expect(await almacen.leer()).toBeNull();
  });

  it('sin conexión lo explica', async () => {
    const { servicio, cliente } = montar();
    cliente.recuperarPassword.mockRejectedValue(new ErrorDeRed('No hay conexión con el servidor.'));

    expect(await servicio.recuperarPassword({ email: 'ana@correo.com' })).toEqual({
      ok: false,
      errores: {
        general: 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      },
    });
  });

  it('muchos intentos (429) muestra el mensaje de la API; un 5xx no enseña el texto técnico', async () => {
    const { servicio, cliente } = montar();
    cliente.recuperarPassword.mockRejectedValueOnce(
      new ErrorApi(429, 'Demasiados intentos. Inténtalo más tarde.'),
    );
    cliente.recuperarPassword.mockRejectedValueOnce(new ErrorApi(500, 'Error interno'));

    expect(await servicio.recuperarPassword({ email: 'a@b.co' })).toEqual({
      ok: false,
      errores: { general: 'Demasiados intentos. Inténtalo más tarde.' },
    });
    expect(await servicio.recuperarPassword({ email: 'a@b.co' })).toEqual({
      ok: false,
      errores: { general: 'El servidor tuvo un problema. Inténtalo más tarde.' },
    });
  });
});
