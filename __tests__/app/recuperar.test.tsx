import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SesionProvider } from '@/context/SesionContext';
import { exito, fallo } from '@/services/resultado';
import type { SesionService } from '@/services/sesionService';
import Recuperar from '../../app/recuperar';
import { Raiz } from '../helpers/gestos';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() };
jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => mockRouter,
    useFocusEffect: (efecto: () => (() => void) | undefined) => {
      useEffect(() => efecto(), [efecto]);
    },
  };
});

beforeEach(() => Object.values(mockRouter).forEach((f) => f.mockReset()));

function crearServicio() {
  return {
    restaurar: jest.fn().mockResolvedValue(null),
    iniciarSesion: jest.fn(),
    registrar: jest.fn(),
    recuperarPassword: jest.fn().mockResolvedValue(exito(null)),
    cerrarSesion: jest.fn().mockResolvedValue(undefined),
    alExpirar: jest.fn().mockReturnValue(() => undefined),
  } satisfies SesionService;
}

async function montar(servicio: SesionService) {
  await render(
    <Raiz>
      <SesionProvider servicio={servicio} cargando={null}>
        <Recuperar />
      </SesionProvider>
    </Raiz>,
  );
}

const escribirCorreo = async (correo: string) =>
  fireEvent.changeText(await screen.findByLabelText('Correo electrónico'), correo);
const enviar = () => fireEvent.press(screen.getByRole('button', { name: 'Enviar enlace' }));

describe('pantalla de recuperar contraseña (P14)', () => {
  it('pide el correo y avisa de que hace falta internet', async () => {
    await montar(crearServicio());

    expect(await screen.findByRole('header', { name: 'Recupera tu contraseña' })).toBeTruthy();
    expect(screen.getByText(/Necesitas conexión a internet/)).toBeTruthy();
  });

  it('manda el correo normalizado y muestra el mismo aviso exista o no la cuenta', async () => {
    const servicio = crearServicio();
    await montar(servicio);
    await escribirCorreo('  Ana@Correo.com ');

    await enviar();

    await waitFor(() =>
      expect(servicio.recuperarPassword).toHaveBeenCalledWith({ email: 'ana@correo.com' }),
    );
    expect(await screen.findByText(/Si ese correo tiene una cuenta/)).toBeTruthy();
    expect(screen.getByText(/carpeta de spam/)).toBeTruthy();
    expect(screen.queryByLabelText('Correo electrónico')).toBeNull();
  });

  it('un correo inválido no llega a la API', async () => {
    const servicio = crearServicio();
    await montar(servicio);
    await escribirCorreo('no-es-correo');

    await enviar();

    expect(await screen.findByText('Escribe un correo válido.')).toBeTruthy();
    expect(servicio.recuperarPassword).not.toHaveBeenCalled();
  });

  it('sin conexión o con un error del servidor lo explica y deja reintentar', async () => {
    const servicio = crearServicio();
    servicio.recuperarPassword.mockResolvedValue(
      fallo({ general: 'No hay conexión. Revisa tu conexión e inténtalo de nuevo.' }),
    );
    await montar(servicio);
    await escribirCorreo('ana@correo.com');

    await enviar();

    expect(await screen.findByText(/Revisa tu conexión/)).toBeTruthy();
    expect(screen.getByLabelText('Correo electrónico')).toBeTruthy();
  });

  it('«Volver a iniciar sesión» regresa al login (atrás o, si no hay, reemplazando)', async () => {
    mockRouter.canGoBack.mockReturnValueOnce(true).mockReturnValueOnce(false);
    await montar(crearServicio());

    await fireEvent.press(await screen.findByRole('button', { name: 'Volver a iniciar sesión' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Volver a iniciar sesión' }));

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).toHaveBeenCalledWith('/login');
  });
});
