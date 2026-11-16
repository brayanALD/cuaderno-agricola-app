import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';
import { VisorFoto } from '@/components/VisorFoto';
import { Raiz } from '../helpers/gestos';

// Los tipos que resuelve TypeScript para `getAnimatedStyle` son los de la versión web (void).
const { getAnimatedStyle } = jest.requireActual<{
  getAnimatedStyle: (componente: { props: Record<string, unknown> }) => { transform?: unknown };
}>('react-native-reanimated');

const transformacion = () => getAnimatedStyle(screen.getByTestId('foto-ampliable')).transform;

describe('VisorFoto (gesto: pellizco)', () => {
  it('muestra la foto con su descripción y tres botones de alternativa', async () => {
    await render(<VisorFoto uri="file:///f.jpg" descripcion="Riego del 10 de noviembre" />, {
      wrapper: Raiz,
    });

    expect(screen.getByLabelText('Riego del 10 de noviembre')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acercar la foto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Alejar la foto' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restablecer el zoom de la foto' })).toBeTruthy();
  });

  it('pellizcar amplía la foto (dos dedos que se separan)', async () => {
    jest.useFakeTimers();
    await render(<VisorFoto uri="file:///f.jpg" descripcion="Foto" />, { wrapper: Raiz });

    const controlador = createGestureController('gesto-pellizco');
    await act(async () => {
      controlador.begin();
      controlador.activate();
      controlador.update({ scale: 2.5 });
      jest.advanceTimersByTime(100);
    });
    jest.useRealTimers();

    expect(transformacion()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 2.5 }]);
  });

  it('el zoom nunca pasa de 4× ni baja de 1×', async () => {
    jest.useFakeTimers();
    await render(<VisorFoto uri="file:///f.jpg" descripcion="Foto" />, { wrapper: Raiz });
    const controlador = createGestureController('gesto-pellizco');

    await act(async () => {
      controlador.begin();
      controlador.activate();
      controlador.update({ scale: 9 });
      jest.advanceTimersByTime(100);
    });
    expect(transformacion()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 4 }]);

    await act(async () => {
      controlador.update({ scale: 0.1 });
      jest.advanceTimersByTime(100);
    });
    jest.useRealTimers();
    expect(transformacion()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
  });

  it('«Acercar», «Alejar» y «Restablecer» cambian el zoom de a 0,5×', async () => {
    jest.useFakeTimers();
    await render(<VisorFoto uri="file:///f.jpg" descripcion="Foto" />, { wrapper: Raiz });
    const avanzar = () =>
      act(async () => {
        jest.advanceTimersByTime(400);
      });

    await fireEvent.press(screen.getByRole('button', { name: 'Acercar la foto' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Acercar la foto' }));
    await avanzar();
    expect(transformacion()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 2 }]);

    await fireEvent.press(screen.getByRole('button', { name: 'Alejar la foto' }));
    await avanzar();
    expect(transformacion()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1.5 }]);

    await fireEvent.press(screen.getByRole('button', { name: 'Restablecer el zoom de la foto' }));
    await avanzar();
    expect(transformacion()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
    jest.useRealTimers();
  });
});
