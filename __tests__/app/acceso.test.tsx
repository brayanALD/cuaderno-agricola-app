import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { SesionProvider } from '@/context/SesionContext';
import { exito, fallo } from '@/services/resultado';
import type { SesionService } from '@/services/sesionService';
import Login from '../../app/login';
import Registro from '../../app/registro';
import { SESION } from '../helpers/sesion';
import { Raiz } from '../helpers/gestos';

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(),
};
/** Permite simular que la pantalla pierde el foco (otra se abre encima) sin desmontarla. */
const mockFoco = { perder: () => undefined as void };
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => mockRouter,
    useFocusEffect: (efecto: () => (() => void) | undefined) => {
      useEffect(() => {
        const limpiar = efecto();
        mockFoco.perder = () => limpiar?.();
        return limpiar;
      }, [efecto]);
    },
  };
});

beforeEach(() => {
  Object.values(mockRouter).forEach((f) => f.mockReset());
});

function crearServicio(inicial: typeof SESION.usuario | null = null) {
  return {
    restaurar: jest.fn().mockResolvedValue(inicial),
    iniciarSesion: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    registrar: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    recuperarPassword: jest.fn().mockResolvedValue({ ok: true, valor: null }),
    cerrarSesion: jest.fn().mockResolvedValue(undefined),
    alExpirar: jest.fn().mockReturnValue(() => undefined),
  } satisfies SesionService;
}

async function montar(pantalla: ReactNode, servicio: SesionService) {
  await render(
    <Raiz>
      <SesionProvider servicio={servicio} cargando={null}>
        {pantalla}
      </SesionProvider>
    </Raiz>,
  );
}

async function escribir(correo: string, clave: string, confirmacion?: string) {
  await fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), correo);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), clave);
  if (confirmacion !== undefined) {
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), confirmacion);
  }
}

describe('pantalla de login', () => {
  it('tiene un título de encabezado y avisa de que hace falta internet para entrar', async () => {
    await montar(<Login />, crearServicio());

    expect(await screen.findByRole('header', { name: 'Inicia sesión' })).toBeTruthy();
    expect(screen.getByText(/Necesitas conexión a internet/)).toBeTruthy();
  });

  it('con correo y contraseña llama a iniciar sesión', async () => {
    const servicio = crearServicio();
    await montar(<Login />, servicio);
    await escribir('Ana@Correo.com', 'clave-segura-1');

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() =>
      expect(servicio.iniciarSesion).toHaveBeenCalledWith({
        email: 'ana@correo.com',
        password: 'clave-segura-1',
      }),
    );
  });

  it('si la API rechaza las credenciales lo muestra', async () => {
    const servicio = crearServicio();
    servicio.iniciarSesion.mockResolvedValue(
      fallo({ general: 'Correo o contraseña incorrectos.' }),
    );
    await montar(<Login />, servicio);
    await escribir('ana@correo.com', 'mal');

    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy();
  });

  it('ofrece recuperar la contraseña', async () => {
    await montar(<Login />, crearServicio());

    await fireEvent.press(await screen.findByRole('button', { name: '¿Olvidaste tu contraseña?' }));

    expect(mockRouter.push).toHaveBeenCalledWith('/recuperar');
  });

  it('ofrece crear una cuenta', async () => {
    await montar(<Login />, crearServicio());

    await fireEvent.press(await screen.findByRole('button', { name: /No tienes cuenta/ }));

    expect(mockRouter.push).toHaveBeenCalledWith('/registro');
  });
});

describe('el formulario se limpia al salir de la pantalla (H8)', () => {
  it('login: al ir a «Crear cuenta» y volver no queda la contraseña ni el error de antes', async () => {
    const servicio = crearServicio();
    servicio.iniciarSesion.mockResolvedValue(
      fallo({ general: 'Correo o contraseña incorrectos.' }),
    );
    await montar(<Login />, servicio);
    await escribir('ana@correo.com', 'clave-mala-1');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy();

    await act(async () => mockFoco.perder());

    expect(screen.getByLabelText('Correo electrónico').props.value).toBe('');
    expect(screen.getByLabelText('Contraseña').props.value).toBe('');
    expect(screen.queryByText('Correo o contraseña incorrectos.')).toBeNull();
  });

  it('registro: también se limpia al salir', async () => {
    await montar(<Registro />, crearServicio());
    await escribir('ana@correo.com', 'clave-segura-1');

    await act(async () => mockFoco.perder());

    expect(screen.getByLabelText('Correo electrónico').props.value).toBe('');
    expect(screen.getByLabelText('Contraseña').props.value).toBe('');
  });
});

describe('pantalla de registro', () => {
  it('muestra la regla de la contraseña y registra con los datos escritos', async () => {
    const servicio = crearServicio();
    await montar(<Registro />, servicio);
    expect(await screen.findByRole('header', { name: 'Crea tu cuenta' })).toBeTruthy();
    expect(screen.getByText('Al menos 8 caracteres.')).toBeTruthy();
    await escribir('ana@correo.com', 'clave-segura-1', 'clave-segura-1');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() =>
      expect(servicio.registrar).toHaveBeenCalledWith({
        email: 'ana@correo.com',
        password: 'clave-segura-1',
      }),
    );
  });

  it('pide repetir la contraseña y no registra si no coinciden (P14)', async () => {
    const servicio = crearServicio();
    await montar(<Registro />, servicio);
    await escribir('ana@correo.com', 'clave-segura-1', 'clave-segura-9');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(servicio.registrar).not.toHaveBeenCalled();
  });

  it('una contraseña corta no llega a la API', async () => {
    const servicio = crearServicio();
    await montar(<Registro />, servicio);
    await escribir('ana@correo.com', '1234', '1234');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy();
    expect(servicio.registrar).not.toHaveBeenCalled();
  });

  it('un correo repetido se marca en su campo', async () => {
    const servicio = crearServicio();
    servicio.registrar.mockResolvedValue(fallo({ email: 'Ese correo ya está registrado.' }));
    await montar(<Registro />, servicio);
    await escribir('ana@correo.com', 'clave-segura-1', 'clave-segura-1');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByText('Ese correo ya está registrado.')).toBeTruthy();
  });

  it('«Ya tengo cuenta» vuelve atrás si hay pantalla anterior', async () => {
    mockRouter.canGoBack.mockReturnValue(true);
    await montar(<Registro />, crearServicio());

    await fireEvent.press(await screen.findByRole('button', { name: /Ya tienes cuenta/ }));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('«Ya tengo cuenta» abre el login si no hay pantalla anterior', async () => {
    mockRouter.canGoBack.mockReturnValue(false);
    await montar(<Registro />, crearServicio());

    await fireEvent.press(await screen.findByRole('button', { name: /Ya tienes cuenta/ }));

    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});
