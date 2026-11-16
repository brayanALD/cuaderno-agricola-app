import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useUbicacionConAltitud } from '@/sensors/useUbicacionConAltitud';

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('expo-sensors', () => ({
  Barometer: { isAvailableAsync: jest.fn(), setUpdateInterval: jest.fn(), addListener: jest.fn() },
}));

const Location = jest.requireMock<{
  hasServicesEnabledAsync: jest.Mock;
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
}>('expo-location');
const { Barometer } = jest.requireMock<{
  Barometer: { isAvailableAsync: jest.Mock; addListener: jest.Mock };
}>('expo-sensors');

let alLeer: (lectura: { pressure: number }) => void = () => undefined;

const posicion = (altitude: number | null) => ({
  coords: { latitude: 4.65, longitude: -75.57, altitude, accuracy: 10 },
});

beforeEach(() => {
  Location.hasServicesEnabledAsync.mockReset().mockResolvedValue(true);
  Location.requestForegroundPermissionsAsync.mockReset().mockResolvedValue({ status: 'granted' });
  Location.getCurrentPositionAsync.mockReset().mockResolvedValue(posicion(1650));
  Barometer.isAvailableAsync.mockReset().mockResolvedValue(false);
  Barometer.addListener.mockReset().mockImplementation((oyente) => {
    alLeer = oyente;
    return { remove: jest.fn() };
  });
});

describe('useUbicacionConAltitud (criterio de aceptación 3)', () => {
  it('antes de pedirla no hay altitud ni se toca el barómetro', async () => {
    const { result } = await renderHook(() => useUbicacionConAltitud());

    expect(result.current.altitud).toBeNull();
    expect(Barometer.isAvailableAsync).not.toHaveBeenCalled();
  });

  it('sin barómetro: la altitud sale del GPS con aviso de menor precisión', async () => {
    const { result } = await renderHook(() => useUbicacionConAltitud());

    await act(async () => {
      await result.current.obtener();
    });
    await waitFor(() => expect(Barometer.isAvailableAsync).toHaveBeenCalled());

    expect(result.current.altitud).toMatchObject({ metros: 1650, fuente: 'gps' });
    expect(result.current.altitud?.aviso).toContain('menor precisión');
  });

  it('con barómetro: usa la presión y no avisa', async () => {
    Barometer.isAvailableAsync.mockResolvedValue(true);
    const { result } = await renderHook(() => useUbicacionConAltitud());
    await act(async () => {
      await result.current.obtener();
    });
    await waitFor(() => expect(Barometer.addListener).toHaveBeenCalled());

    await act(async () => {
      alLeer({ pressure: 900 });
    });

    expect(result.current.altitud?.fuente).toBe('barometro');
    expect(result.current.altitud?.aviso).toBeNull();
    expect(Math.abs((result.current.altitud?.metros ?? 0) - 988.6)).toBeLessThan(1);
  });

  it('sin barómetro y sin altitud en el GPS: pide escribirla a mano', async () => {
    Location.getCurrentPositionAsync.mockResolvedValue(posicion(null));
    const { result } = await renderHook(() => useUbicacionConAltitud());

    await act(async () => {
      await result.current.obtener();
    });

    expect(result.current.altitud).toMatchObject({ metros: null, fuente: 'manual' });
    expect(result.current.altitud?.aviso).toContain('a mano');
  });

  it('si falla la ubicación, no hay altitud y el mensaje explica qué pasó', async () => {
    Location.hasServicesEnabledAsync.mockResolvedValue(false);
    const { result } = await renderHook(() => useUbicacionConAltitud());

    await act(async () => {
      await result.current.obtener();
    });

    expect(result.current.altitud).toBeNull();
    expect(result.current.estado).toBe('no-disponible');
  });
});
