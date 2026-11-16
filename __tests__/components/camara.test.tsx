import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { SeccionFoto } from '@/components/formularios/SeccionFoto';
import { crearContextoDePrueba } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { crearFotosEnMemoria } from '../helpers/fotosEnMemoria';

jest.mock('expo-camera', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const tomar = jest.fn();
  const montajes: { onMountError?: () => void }[] = [];
  const CameraView = React.forwardRef(function VistaCamara(
    props: { onMountError?: () => void },
    ref: React.Ref<unknown>,
  ) {
    montajes.push(props);
    React.useImperativeHandle(ref, () => ({ takePictureAsync: tomar }));
    return React.createElement(View, { testID: 'vista-camara' });
  });
  return {
    CameraView: Object.assign(CameraView, { isAvailableAsync: jest.fn() }),
    useCameraPermissions: jest.fn(),
    __tomar: tomar,
    __montajes: montajes,
  };
});

const camara = jest.requireMock<{
  CameraView: { isAvailableAsync: jest.Mock };
  useCameraPermissions: jest.Mock;
  __tomar: jest.Mock;
  __montajes: { onMountError?: () => void }[];
}>('expo-camera');

// Renderizar el contexto con SQLite en memoria y un `Modal` es lento cuando Jest corre en paralelo.
jest.setTimeout(20_000);

const pedirPermiso = jest.fn();
const conPermiso = (permiso: { granted: boolean; canAskAgain: boolean } | null) =>
  camara.useCameraPermissions.mockReturnValue([permiso, pedirPermiso]);

beforeEach(() => {
  camara.CameraView.isAvailableAsync.mockReset().mockResolvedValue(true);
  camara.__tomar.mockReset().mockResolvedValue({ uri: 'file:///cache/Camera/a.jpg' });
  pedirPermiso.mockReset();
  conPermiso({ granted: true, canAskAgain: true });
});

async function montar(uri: string | null = null) {
  const fotos = crearFotosEnMemoria();
  fotos.sembrar('file:///cache/Camera/a.jpg');
  const ctx = { ...(await crearContextoDePrueba()), fotos };
  const alCambiar = jest.fn();
  const Envoltorio = crearEnvoltorio(ctx);
  await render(
    <Envoltorio>
      <SeccionFoto uri={uri} alCambiar={alCambiar} />
    </Envoltorio>,
  );
  await act(async () => undefined);
  return { alCambiar, fotos };
}

const abrir = async () => {
  await fireEvent.press(screen.getByRole('button', { name: 'Tomar foto' }));
  await act(async () => undefined);
};
const enModal = () => within(screen.getByTestId('modal-camara'));

describe('cámara de la labor (segunda capacidad, P1)', () => {
  it('no abre la cámara ni pide permiso hasta que el usuario toca «Tomar foto»', async () => {
    await montar();

    expect(camara.CameraView.isAvailableAsync).not.toHaveBeenCalled();
    expect(screen.queryByTestId('modal-camara')).toBeNull();
  });

  it('con permiso: toma la foto, guarda la COPIA PERMANENTE y cierra la cámara', async () => {
    const { alCambiar, fotos } = await montar();
    await abrir();

    await fireEvent.press(enModal().getByRole('button', { name: 'Tomar foto' }));
    await act(async () => undefined);

    expect(alCambiar).toHaveBeenCalledWith('file:///permanente/id-1.jpg');
    expect(fotos.archivos.has('file:///permanente/id-1.jpg')).toBe(true);
    expect(screen.queryByTestId('modal-camara')).toBeNull();
  });

  it('sin permiso aún: explica para qué y lo pide solo al tocar «Permitir cámara»', async () => {
    conPermiso({ granted: false, canAskAgain: true });
    await montar();
    await abrir();

    expect(enModal().getByText(/solo para fotografiar esta labor/)).toBeTruthy();
    expect(pedirPermiso).not.toHaveBeenCalled();

    await fireEvent.press(enModal().getByRole('button', { name: 'Permitir cámara' }));

    expect(pedirPermiso).toHaveBeenCalledTimes(1);
  });

  it('con el permiso denegado: lo explica, no insiste y se puede cancelar (la app no se rompe)', async () => {
    conPermiso({ granted: false, canAskAgain: false });
    await montar();
    await abrir();

    expect(enModal().getByText(/No tenemos permiso para usar la cámara/)).toBeTruthy();
    expect(enModal().queryByRole('button', { name: 'Permitir cámara' })).toBeNull();

    await fireEvent.press(enModal().getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByTestId('modal-camara')).toBeNull();
  });

  it('sin cámara (regla 1: isAvailableAsync): avisa y la galería sigue disponible', async () => {
    camara.CameraView.isAvailableAsync.mockResolvedValue(false);
    await montar();

    await abrir();

    expect(screen.getByText(/no tiene cámara disponible/)).toBeTruthy();
    expect(screen.queryByTestId('modal-camara')).toBeNull();
    expect(screen.getByRole('button', { name: 'Elegir de la galería' })).toBeTruthy();
  });

  it('si consultar la cámara falla, cuenta como «sin cámara»', async () => {
    camara.CameraView.isAvailableAsync.mockRejectedValue(new Error('roto'));
    await montar();

    await abrir();

    expect(screen.getByText(/no tiene cámara disponible/)).toBeTruthy();
  });

  it('en Android no existe isAvailableAsync (solo web): se da por hecha la cámara y se abre', async () => {
    camara.CameraView.isAvailableAsync.mockRejectedValue({ code: 'ERR_UNAVAILABLE' });
    await montar();

    await abrir();

    expect(screen.getByTestId('modal-camara')).toBeTruthy();
    expect(screen.queryByText(/no tiene cámara disponible/)).toBeNull();
  });

  it('si la vista previa no arranca (onMountError), avisa y se puede cancelar', async () => {
    await montar();
    await abrir();

    await act(async () => {
      camara.__montajes.at(-1)?.onMountError?.();
    });

    expect(enModal().getByText(/No se pudo iniciar la cámara/)).toBeTruthy();
    expect(enModal().getByRole('button', { name: 'Cancelar' })).toBeTruthy();
  });

  it('si la captura falla, avisa y deja la cámara abierta para reintentar', async () => {
    camara.__tomar.mockRejectedValue(new Error('sin memoria'));
    const { alCambiar } = await montar();
    await abrir();

    await fireEvent.press(enModal().getByRole('button', { name: 'Tomar foto' }));
    await act(async () => undefined);

    expect(enModal().getByText('No se pudo tomar la foto. Intenta de nuevo.')).toBeTruthy();
    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('cancelar cierra la cámara sin cambiar la foto', async () => {
    const { alCambiar } = await montar('file:///permanente/vieja.jpg');
    await abrir();

    await fireEvent.press(enModal().getByRole('button', { name: 'Cancelar' }));

    expect(alCambiar).not.toHaveBeenCalled();
    expect(screen.queryByTestId('modal-camara')).toBeNull();
  });
});
