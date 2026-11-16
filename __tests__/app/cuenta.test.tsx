import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { CuadernoProvider } from '@/context/CuadernoContext';
import { SesionProvider } from '@/context/SesionContext';
import { SincronizacionProvider } from '@/context/SincronizacionContext';
import { crearLote } from '@/services/loteService';
import { exito } from '@/services/resultado';
import type { SesionService } from '@/services/sesionService';
import PantallaCuenta from '../../app/(app)/(tabs)/cuenta';
import { datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { Raiz } from '../helpers/gestos';
import { SESION } from '../helpers/sesion';
import { crearServidorFalso } from '../helpers/servidorFalso';

function crearServicio() {
  return {
    restaurar: jest.fn().mockResolvedValue(SESION.usuario),
    iniciarSesion: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    registrar: jest.fn().mockResolvedValue(exito(SESION.usuario)),
    recuperarPassword: jest.fn().mockResolvedValue({ ok: true, valor: null }),
    cerrarSesion: jest.fn().mockResolvedValue(undefined),
    alExpirar: jest.fn().mockReturnValue(() => undefined),
  } satisfies SesionService;
}

async function montar(servicio: SesionService, sembrar = false) {
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  const { ctx } = await crearDispositivo();
  if (sembrar) await crearLote(ctx, datosLote());
  const servidor = crearServidorFalso();
  // Sin red al abrir: así la sincronización no corre sola y la prueba controla cuándo se pulsa el botón.
  const red = { actual: () => Promise.resolve(false), suscribir: () => () => undefined };
  const abrir = () => Promise.resolve(ctx);
  await render(
    <Raiz>
      <SesionProvider servicio={servicio} cargando={null}>
        <CuadernoProvider abrir={abrir} cargando={null} alError={() => null}>
          <SincronizacionProvider cliente={servidor} red={red}>
            <PantallaCuenta />
          </SincronizacionProvider>
        </CuadernoProvider>
      </SesionProvider>
    </Raiz>,
  );
  return { ctx, servidor };
}

afterEach(() => jest.restoreAllMocks());

describe('pestaña Cuenta', () => {
  it('muestra el correo de la sesión y explica qué pasa con los datos al cerrarla', async () => {
    await montar(crearServicio());

    expect(await screen.findByText('ana@correo.com')).toBeTruthy();
    expect(screen.getByText(/se quedan guardados en este teléfono/)).toBeTruthy();
  });

  it('muestra el estado de la sincronización y los cambios pendientes', async () => {
    await montar(crearServicio(), true);

    expect(await screen.findByText('1 cambio por enviar.')).toBeTruthy();
    expect(screen.getByText('Aún no se ha sincronizado.')).toBeTruthy();
    expect(screen.getByText('Sin conexión a internet.')).toBeTruthy();
  });

  it('«Sincronizar ahora» envía lo pendiente y actualiza el panel', async () => {
    const { servidor } = await montar(crearServicio(), true);
    await screen.findByText('1 cambio por enviar.');

    await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar ahora' }));

    await waitFor(() => expect(servidor.lotes.size).toBe(1));
    expect(await screen.findByText('Todo está sincronizado.')).toBeTruthy();
    expect(screen.getByText(/Última sincronización:/)).toBeTruthy();
  });

  it('«Cerrar sesión» cierra la sesión', async () => {
    const servicio = crearServicio();
    await montar(servicio);

    await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => expect(servicio.cerrarSesion).toHaveBeenCalledTimes(1));
  });

  it('si no se puede cerrar la sesión lo dice en vez de fallar en silencio', async () => {
    const servicio = crearServicio();
    servicio.cerrarSesion.mockRejectedValue(new Error('Keystore error'));
    await montar(servicio);

    await fireEvent.press(await screen.findByRole('button', { name: 'Cerrar sesión' }));

    expect(
      await screen.findByText('No se pudo cerrar la sesión. Inténtalo de nuevo.'),
    ).toBeTruthy();
    expect(screen.getByText('ana@correo.com')).toBeTruthy();
  });
});
