import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { MedidorLuz } from '@/components/formularios/MedidorLuz';
import { ESPERA_MAXIMA_MS } from '@/sensors/medirLuz';

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
  quitar.mockReset();
  LightSensor.isAvailableAsync.mockReset().mockResolvedValue(true);
  LightSensor.setUpdateInterval.mockReset();
  LightSensor.addListener.mockReset().mockImplementation((oyente) => {
    alLeer = oyente;
    return { remove: quitar };
  });
});

const medir = async () => {
  await fireEvent.press(screen.getByRole('button', { name: 'Medir la luz con el sensor' }));
};

describe('MedidorLuz (segunda capacidad, P1)', () => {
  it('no toca el sensor hasta que el usuario lo pide', async () => {
    await render(<MedidorLuz alMedir={jest.fn()} />);

    expect(LightSensor.isAvailableAsync).not.toHaveBeenCalled();
  });

  it('con mucha luz entrega «soleado» y muestra el valor medido', async () => {
    const alMedir = jest.fn();
    await render(<MedidorLuz alMedir={alMedir} />);
    await medir();
    await act(async () => undefined);

    await act(async () => {
      alLeer({ illuminance: 32000 });
    });

    expect(alMedir).toHaveBeenCalledWith('soleado');
    expect(screen.getByText('Luz medida: 32000 lx → Soleado.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Medir la luz con el sensor' })).toBeTruthy();
  });

  it('con poca luz entrega «nublado»', async () => {
    const alMedir = jest.fn();
    await render(<MedidorLuz alMedir={alMedir} />);
    await medir();
    await act(async () => undefined);

    await act(async () => {
      alLeer({ illuminance: 800 });
    });

    expect(alMedir).toHaveBeenCalledWith('nublado');
  });

  it('sin sensor avisa y deja la opción manual (la app no se rompe)', async () => {
    LightSensor.isAvailableAsync.mockResolvedValue(false);
    const alMedir = jest.fn();
    await render(<MedidorLuz alMedir={alMedir} />);

    await medir();
    await act(async () => undefined);

    expect(
      screen.getByText('Este teléfono no tiene sensor de luz. Elige la opción a mano.'),
    ).toBeTruthy();
    expect(alMedir).not.toHaveBeenCalled();
  });

  it('si el sensor no emite nada, deja de esperar y avisa', async () => {
    jest.useFakeTimers();
    try {
      const alMedir = jest.fn();
      await render(<MedidorLuz alMedir={alMedir} />);
      await medir();
      await act(async () => undefined);

      await act(async () => {
        jest.advanceTimersByTime(ESPERA_MAXIMA_MS + 10);
      });

      expect(
        screen.getByText('No se obtuvo una lectura del sensor. Elige la opción a mano.'),
      ).toBeTruthy();
      expect(alMedir).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('medir otra vez no reutiliza la lectura anterior', async () => {
    const alMedir = jest.fn();
    await render(<MedidorLuz alMedir={alMedir} />);
    await medir();
    await act(async () => undefined);
    await act(async () => {
      alLeer({ illuminance: 32000 });
    });
    alMedir.mockClear();

    await medir();
    await act(async () => undefined);

    expect(alMedir).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Midiendo la luz…' })).toBeTruthy();
  });

  it('al salir de la pantalla en plena medición, cancela la suscripción al sensor', async () => {
    const { unmount } = await render(<MedidorLuz alMedir={jest.fn()} />);
    await medir();
    await act(async () => undefined);

    await unmount();

    expect(quitar).toHaveBeenCalledTimes(1);
  });
});
