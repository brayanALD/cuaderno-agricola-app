import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useUbicacion } from '@/sensors/useUbicacion';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const Location = jest.requireMock<{
  hasServicesEnabledAsync: jest.Mock;
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
}>('expo-location');

const posicion = {
  coords: { latitude: 4.65, longitude: -75.57, altitude: 1650, accuracy: 10 },
};

beforeEach(() => {
  Location.hasServicesEnabledAsync.mockReset().mockResolvedValue(true);
  Location.requestForegroundPermissionsAsync.mockReset().mockResolvedValue({ status: 'granted' });
  Location.getCurrentPositionAsync.mockReset().mockResolvedValue(posicion);
});

describe('useUbicacion', () => {
  it('empieza inactiva: no pide permisos ni sensores hasta que el usuario lo pide (regla 2)', async () => {
    const { result } = await renderHook(() => useUbicacion());

    expect(result.current.estado).toBe('inactiva');
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('al obtener: comprueba que el servicio esté activo, pide permiso y lee la posición', async () => {
    const { result } = await renderHook(() => useUbicacion());

    await act(async () => {
      await result.current.obtener();
    });

    expect(Location.hasServicesEnabledAsync).toHaveBeenCalled();
    expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({ accuracy: 4 });
    expect(result.current).toMatchObject({
      estado: 'lista',
      medicion: { lat: 4.65, lng: -75.57, altitudGpsM: 1650, precisionM: 10 },
    });
  });

  it('mientras busca está en «buscando»', async () => {
    let entregar: (valor: unknown) => void = () => undefined;
    Location.getCurrentPositionAsync.mockReturnValue(
      new Promise((resolve) => {
        entregar = resolve;
      }),
    );
    const { result } = await renderHook(() => useUbicacion());

    await act(async () => {
      void result.current.obtener();
    });
    expect(result.current.estado).toBe('buscando');

    await act(async () => {
      entregar(posicion);
    });
    await waitFor(() => expect(result.current.estado).toBe('lista'));
  });

  it('sin servicio de ubicación activo → «no-disponible», sin pedir permiso ni romper', async () => {
    Location.hasServicesEnabledAsync.mockResolvedValue(false);
    const { result } = await renderHook(() => useUbicacion());

    await act(async () => {
      await result.current.obtener();
    });

    expect(result.current.estado).toBe('no-disponible');
    expect(result.current.mensaje).toContain('activa la ubicación');
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('permiso denegado → «sin-permiso» con un mensaje que explica la alternativa', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { result } = await renderHook(() => useUbicacion());

    await act(async () => {
      await result.current.obtener();
    });

    expect(result.current.estado).toBe('sin-permiso');
    expect(result.current.mensaje).toContain('a mano');
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('si la lectura falla → «error» con el mensaje, sin lanzar', async () => {
    Location.getCurrentPositionAsync.mockRejectedValue(new Error('Sin señal GPS'));
    const { result } = await renderHook(() => useUbicacion());

    await act(async () => {
      await result.current.obtener();
    });

    expect(result.current).toMatchObject({ estado: 'error', mensaje: 'Sin señal GPS' });
  });

  it('se puede volver a intentar después de un error', async () => {
    Location.getCurrentPositionAsync.mockRejectedValueOnce(new Error('Sin señal GPS'));
    const { result } = await renderHook(() => useUbicacion());
    await act(async () => {
      await result.current.obtener();
    });

    await act(async () => {
      await result.current.obtener();
    });

    expect(result.current.estado).toBe('lista');
  });

  it('si se desmonta mientras busca, no actualiza el estado', async () => {
    let entregar: (valor: unknown) => void = () => undefined;
    Location.getCurrentPositionAsync.mockReturnValue(
      new Promise((resolve) => {
        entregar = resolve;
      }),
    );
    const errores = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result, unmount } = await renderHook(() => useUbicacion());
    await act(async () => {
      void result.current.obtener();
    });

    await unmount();
    await act(async () => {
      entregar(posicion);
    });

    expect(errores).not.toHaveBeenCalled();
    errores.mockRestore();
  });
});
