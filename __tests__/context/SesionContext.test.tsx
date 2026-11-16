import { act, renderHook, screen, waitFor, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ReactNode } from 'react';
import { SesionProvider, useSesion } from '@/context/SesionContext';
import { exito, fallo } from '@/services/resultado';
import type { SesionService } from '@/services/sesionService';
import { SESION } from '../helpers/sesion';

const DATOS = { email: 'ana@correo.com', password: 'clave-segura-1' };

function crearServicio(inicial: typeof SESION.usuario | null = null) {
  let expirar: () => void = () => undefined;
  const baja = jest.fn();
  const servicio = {
    restaurar: jest.fn().mockResolvedValue(inicial),
    iniciarSesion: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    registrar: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    recuperarPassword: jest.fn().mockResolvedValue({ ok: true, valor: null }),
    cerrarSesion: jest.fn().mockResolvedValue(undefined),
    alExpirar: jest.fn((oyente: () => void) => {
      expirar = oyente;
      return baja;
    }),
  } satisfies SesionService;
  return { servicio, baja, expirar: () => expirar() };
}

function envoltorio(servicio: SesionService) {
  return function Envoltorio({ children }: { children: ReactNode }) {
    return (
      <SesionProvider servicio={servicio} cargando={<Text>Cargando sesión</Text>}>
        {children}
      </SesionProvider>
    );
  };
}

async function montar(servicio: SesionService) {
  const hook = await renderHook(() => useSesion(), { wrapper: envoltorio(servicio) });
  await waitFor(() => expect(screen.queryByText('Cargando sesión')).toBeNull());
  return hook;
}

describe('SesionProvider', () => {
  it('mientras restaura muestra «cargando» y no deja pasar a las pantallas', async () => {
    const { servicio } = crearServicio();
    servicio.restaurar.mockReturnValue(new Promise(() => undefined));

    await render(
      <SesionProvider servicio={servicio} cargando={<Text>Cargando sesión</Text>}>
        <Text>Contenido</Text>
      </SesionProvider>,
    );

    expect(screen.getByText('Cargando sesión')).toBeTruthy();
    expect(screen.queryByText('Contenido')).toBeNull();
  });

  it('con sesión guardada arranca con el usuario', async () => {
    const { servicio } = crearServicio(SESION.usuario);

    const { result } = await montar(servicio);

    expect(result.current.usuario).toEqual(SESION.usuario);
  });

  it('sin sesión guardada arranca con usuario null', async () => {
    const { servicio } = crearServicio();

    const { result } = await montar(servicio);

    expect(result.current.usuario).toBeNull();
  });

  it('si restaurar fallara, no deja la pantalla cargando para siempre: sin sesión', async () => {
    const { servicio } = crearServicio();
    servicio.restaurar.mockRejectedValue(new Error('fallo'));

    const { result } = await montar(servicio);

    expect(result.current.usuario).toBeNull();
  });

  it('iniciar sesión bien hecho pone al usuario y devuelve el resultado', async () => {
    const { servicio } = crearServicio();
    const { result } = await montar(servicio);

    let resultado: unknown;
    await act(async () => {
      resultado = await result.current.iniciarSesion(DATOS);
    });

    expect(resultado).toEqual(exito(SESION.usuario));
    expect(servicio.iniciarSesion).toHaveBeenCalledWith(DATOS);
    expect(result.current.usuario).toEqual(SESION.usuario);
  });

  it('iniciar sesión con error NO cambia el usuario y devuelve los errores', async () => {
    const { servicio } = crearServicio();
    servicio.iniciarSesion.mockResolvedValue(
      fallo({ general: 'Correo o contraseña incorrectos.' }),
    );
    const { result } = await montar(servicio);

    let resultado: unknown;
    await act(async () => {
      resultado = await result.current.iniciarSesion(DATOS);
    });

    expect(resultado).toEqual(fallo({ general: 'Correo o contraseña incorrectos.' }));
    expect(result.current.usuario).toBeNull();
  });

  it('registrarse bien hecho deja al usuario con sesión', async () => {
    const { servicio } = crearServicio();
    const { result } = await montar(servicio);

    await act(async () => {
      await result.current.registrar(DATOS);
    });

    expect(servicio.registrar).toHaveBeenCalledWith(DATOS);
    expect(result.current.usuario).toEqual(SESION.usuario);
  });

  it('cerrar sesión borra la sesión y el usuario pasa a null', async () => {
    const { servicio } = crearServicio(SESION.usuario);
    const { result } = await montar(servicio);

    await act(async () => {
      await result.current.cerrarSesion();
    });

    expect(servicio.cerrarSesion).toHaveBeenCalledTimes(1);
    expect(result.current.usuario).toBeNull();
  });

  it('cuando la sesión expira (renovación rechazada) vuelve a sin sesión', async () => {
    const { servicio, expirar } = crearServicio(SESION.usuario);
    const { result } = await montar(servicio);

    await act(async () => {
      expirar();
    });

    expect(result.current.usuario).toBeNull();
  });

  it('al desmontar se da de baja del aviso de expiración', async () => {
    const { servicio, baja } = crearServicio();
    const { unmount } = await montar(servicio);

    await unmount();

    expect(baja).toHaveBeenCalledTimes(1);
  });
});

describe('useSesion', () => {
  it('useSesion sin proveedor avisa del error de programación', async () => {
    const consola = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useSesion())).rejects.toThrow(
      'useSesion debe usarse dentro de <SesionProvider>.',
    );
    consola.mockRestore();
  });
});
