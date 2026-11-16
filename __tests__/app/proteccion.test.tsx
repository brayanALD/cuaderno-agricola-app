import { act } from '@testing-library/react-native';
import { Slot } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { NavegacionRaiz } from '@/components/NavegacionRaiz';
import { SesionProvider } from '@/context/SesionContext';
import { exito } from '@/services/resultado';
import type { SesionService } from '@/services/sesionService';
import { EsquemaProvider } from '@/theme/EsquemaProvider';
import { SESION } from '../helpers/sesion';

function crearServicio(inicial: typeof SESION.usuario | null) {
  let expirar: () => void = () => undefined;
  const servicio = {
    restaurar: jest.fn().mockResolvedValue(inicial),
    iniciarSesion: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    registrar: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    recuperarPassword: jest.fn().mockResolvedValue({ ok: true, valor: null }),
    cerrarSesion: jest.fn().mockResolvedValue(undefined),
    alExpirar: jest.fn((oyente: () => void) => {
      expirar = oyente;
      return () => undefined;
    }),
  } satisfies SesionService;
  return { servicio, expirar: () => expirar() };
}

/** Rutas mínimas con la misma forma que `app/`: `login`, `registro` y un grupo `(app)` con su propio layout. */
async function montar(servicio: SesionService, urlInicial = '/') {
  const Raiz = () => (
    <EsquemaProvider>
      <SesionProvider servicio={servicio} cargando={<Text>Cargando sesión</Text>}>
        <NavegacionRaiz />
      </SesionProvider>
    </EsquemaProvider>
  );
  await renderRouter(
    {
      _layout: Raiz,
      login: () => <Text>Pantalla de login</Text>,
      registro: () => <Text>Pantalla de registro</Text>,
      '(app)/_layout': () => <Slot />,
      '(app)/index': () => <Text>Pantalla privada</Text>,
      '(app)/lote/nuevo': () => <Text>Pantalla privada: nuevo lote</Text>,
    },
    { initialUrl: urlInicial },
  );
}

describe('rutas protegidas por la sesión', () => {
  it('sin sesión se abre el login y no la pantalla privada', async () => {
    const { servicio } = crearServicio(null);

    await montar(servicio);

    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
    expect(screen.queryByText('Pantalla privada')).toBeNull();
  });

  it('con sesión guardada se abre la pantalla privada y no el login', async () => {
    const { servicio } = crearServicio(SESION.usuario);

    await montar(servicio);

    expect(await screen.findByText('Pantalla privada')).toBeTruthy();
    expect(screen.queryByText('Pantalla de login')).toBeNull();
  });

  it('sin sesión un enlace directo a una ruta privada no la abre', async () => {
    const { servicio } = crearServicio(null);

    await montar(servicio, '/lote/nuevo');

    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
    expect(screen.queryByText('Pantalla privada: nuevo lote')).toBeNull();
  });

  it('sin sesión el registro sigue disponible', async () => {
    const { servicio } = crearServicio(null);

    await montar(servicio, '/registro');

    expect(await screen.findByText('Pantalla de registro')).toBeTruthy();
  });

  it('con sesión el login y el registro no existen', async () => {
    const { servicio } = crearServicio(SESION.usuario);

    await montar(servicio, '/registro');

    expect(await screen.findByText('Pantalla privada')).toBeTruthy();
    expect(screen.queryByText('Pantalla de registro')).toBeNull();
  });

  it('cuando la sesión expira se pasa del contenido privado al login', async () => {
    const { servicio, expirar } = crearServicio(SESION.usuario);
    await montar(servicio);
    expect(await screen.findByText('Pantalla privada')).toBeTruthy();

    await act(async () => {
      expirar();
    });

    expect(await screen.findByText('Pantalla de login')).toBeTruthy();
    expect(screen.queryByText('Pantalla privada')).toBeNull();
  });
});
