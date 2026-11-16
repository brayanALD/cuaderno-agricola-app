import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBarometro } from '@/sensors/useBarometro';

jest.mock('expo-sensors', () => ({
  Barometer: {
    isAvailableAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

const { Barometer } = jest.requireMock<{
  Barometer: { isAvailableAsync: jest.Mock; setUpdateInterval: jest.Mock; addListener: jest.Mock };
}>('expo-sensors');

let alLeer: (lectura: { pressure: number }) => void = () => undefined;
const quitar = jest.fn();

beforeEach(() => {
  Barometer.isAvailableAsync.mockReset().mockResolvedValue(true);
  Barometer.setUpdateInterval.mockReset();
  Barometer.addListener.mockReset().mockImplementation((oyente) => {
    alLeer = oyente;
    return { remove: quitar };
  });
  quitar.mockReset();
});

describe('useBarometro', () => {
  it('inactivo: ni siquiera consulta el sensor', async () => {
    const { result } = await renderHook(() => useBarometro(false));

    expect(result.current).toEqual({ disponible: null, presionHpa: null });
    expect(Barometer.isAvailableAsync).not.toHaveBeenCalled();
    expect(Barometer.addListener).not.toHaveBeenCalled();
  });

  it('activo y disponible: se suscribe y entrega la presión en hPa', async () => {
    const { result } = await renderHook(() => useBarometro(true));
    await waitFor(() => expect(Barometer.addListener).toHaveBeenCalled());

    await act(async () => {
      alLeer({ pressure: 900.5 });
    });

    expect(result.current).toEqual({ disponible: true, presionHpa: 900.5 });
    expect(Barometer.setUpdateInterval).toHaveBeenCalledWith(1000);
  });

  it('sin barómetro (regla 1: isAvailableAsync): no se suscribe y la app no se rompe', async () => {
    Barometer.isAvailableAsync.mockResolvedValue(false);

    const { result } = await renderHook(() => useBarometro(true));
    await waitFor(() => expect(result.current.disponible).toBe(false));

    expect(result.current.presionHpa).toBeNull();
    expect(Barometer.addListener).not.toHaveBeenCalled();
  });

  it('si consultar el sensor falla, queda como no disponible', async () => {
    Barometer.isAvailableAsync.mockRejectedValue(new Error('sensor roto'));

    const { result } = await renderHook(() => useBarometro(true));
    await waitFor(() => expect(result.current.disponible).toBe(false));
  });

  it('al desactivarse o desmontarse cancela la suscripción (regla 3: remove)', async () => {
    const { rerender, unmount } = await renderHook((activo: boolean) => useBarometro(activo), {
      initialProps: true,
    });
    await waitFor(() => expect(Barometer.addListener).toHaveBeenCalledTimes(1));

    await rerender(false);
    expect(quitar).toHaveBeenCalledTimes(1);

    await rerender(true);
    await waitFor(() => expect(Barometer.addListener).toHaveBeenCalledTimes(2));
    await unmount();
    expect(quitar).toHaveBeenCalledTimes(2);
  });

  it('si se desmonta antes de saber si hay sensor, no se suscribe', async () => {
    let responder: (hay: boolean) => void = () => undefined;
    Barometer.isAvailableAsync.mockReturnValue(
      new Promise((resolve) => {
        responder = resolve;
      }),
    );
    const { unmount } = await renderHook(() => useBarometro(true));

    await unmount();
    await act(async () => {
      responder(true);
    });

    expect(Barometer.addListener).not.toHaveBeenCalled();
  });
});
