import { act } from '@testing-library/react-native';
import { ESPERA_MAXIMA_MS, medirLuz } from '@/sensors/medirLuz';

jest.mock('expo-sensors', () => ({
  LightSensor: {
    isAvailableAsync: jest.fn(),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

const { LightSensor } = jest.requireMock<{
  LightSensor: {
    isAvailableAsync: jest.Mock;
    setUpdateInterval: jest.Mock;
    addListener: jest.Mock;
  };
}>('expo-sensors');

let alLeer: (lectura: { illuminance: number }) => void = () => undefined;
const quitar = jest.fn();

beforeEach(() => {
  LightSensor.isAvailableAsync.mockReset().mockResolvedValue(true);
  LightSensor.setUpdateInterval.mockReset();
  LightSensor.addListener.mockReset().mockImplementation((oyente) => {
    alLeer = oyente;
    return { remove: quitar };
  });
  quitar.mockReset();
});

const suscrito = () => act(async () => undefined);

describe('medirLuz', () => {
  it('entrega la primera lectura en lux y cancela la suscripción (regla 3)', async () => {
    const medida = medirLuz();
    await suscrito();

    alLeer({ illuminance: 25000 });

    await expect(medida).resolves.toEqual({ tipo: 'lectura', lux: 25000 });
    expect(quitar).toHaveBeenCalledTimes(1);
  });

  it('ignora lecturas inválidas (NaN o negativas) y espera una buena', async () => {
    const medida = medirLuz();
    await suscrito();

    alLeer({ illuminance: Number.NaN });
    alLeer({ illuminance: -5 });
    expect(quitar).not.toHaveBeenCalled();
    alLeer({ illuminance: 300 });

    await expect(medida).resolves.toEqual({ tipo: 'lectura', lux: 300 });
  });

  it('sin sensor (regla 1: isAvailableAsync): no se suscribe', async () => {
    LightSensor.isAvailableAsync.mockResolvedValue(false);

    await expect(medirLuz()).resolves.toEqual({ tipo: 'sin-sensor' });
    expect(LightSensor.addListener).not.toHaveBeenCalled();
  });

  it('si consultar el sensor falla, cuenta como «sin sensor» y no lanza (regla 4)', async () => {
    LightSensor.isAvailableAsync.mockRejectedValue(new Error('sensor roto'));

    await expect(medirLuz()).resolves.toEqual({ tipo: 'sin-sensor' });
  });

  it('si no llega ninguna lectura en el plazo, deja de esperar y cancela la suscripción', async () => {
    jest.useFakeTimers();
    try {
      const medida = medirLuz();
      await suscrito();

      await act(async () => {
        jest.advanceTimersByTime(ESPERA_MAXIMA_MS + 10);
      });

      await expect(medida).resolves.toEqual({ tipo: 'sin-lectura' });
      expect(quitar).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('si se aborta (salir de la pantalla), cancela la suscripción y responde «cancelada»', async () => {
    const control = new AbortController();
    const medida = medirLuz(control.signal);
    await suscrito();

    control.abort();

    await expect(medida).resolves.toEqual({ tipo: 'cancelada' });
    expect(quitar).toHaveBeenCalledTimes(1);
  });

  it('si ya estaba abortada, ni se suscribe', async () => {
    const control = new AbortController();
    control.abort();

    await expect(medirLuz(control.signal)).resolves.toEqual({ tipo: 'cancelada' });
    expect(LightSensor.addListener).not.toHaveBeenCalled();
  });
});
