import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { DeslizarLotes } from '@/components/DeslizarLotes';
import { Texto } from '@/components/Texto';
import { arrastrar, Raiz } from '../helpers/gestos';

describe('DeslizarLotes (gesto: pan con snap)', () => {
  const props = (cambios = {}) => ({
    claveActual: 'a',
    hayAnterior: true,
    haySiguiente: true,
    posicion: 'Lote 2 de 3',
    alCambiar: jest.fn(),
    ...cambios,
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  const pasarTiempo = async () => {
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
  };

  it('un arrastre largo a la izquierda pasa al siguiente y a la derecha al anterior', async () => {
    const p = props();
    await render(
      <DeslizarLotes {...p}>
        <Texto>Ficha</Texto>
      </DeslizarLotes>,
      { wrapper: Raiz },
    );

    await arrastrar('gesto-deslizar-lotes', { translationX: -250, velocityX: -200 });
    await pasarTiempo();
    expect(p.alCambiar).toHaveBeenLastCalledWith('siguiente');

    await arrastrar('gesto-deslizar-lotes', { translationX: 250, velocityX: 200 });
    await pasarTiempo();
    expect(p.alCambiar).toHaveBeenLastCalledWith('anterior');
  });

  it('un empujón rápido basta aunque el arrastre sea corto', async () => {
    const p = props();
    await render(
      <DeslizarLotes {...p}>
        <Texto>Ficha</Texto>
      </DeslizarLotes>,
      { wrapper: Raiz },
    );

    await arrastrar('gesto-deslizar-lotes', { translationX: -40, velocityX: -1200 });
    await pasarTiempo();

    expect(p.alCambiar).toHaveBeenCalledWith('siguiente');
  });

  it('un arrastre corto y lento vuelve a su sitio sin cambiar de lote', async () => {
    const p = props();
    await render(
      <DeslizarLotes {...p}>
        <Texto>Ficha</Texto>
      </DeslizarLotes>,
      { wrapper: Raiz },
    );

    await arrastrar('gesto-deslizar-lotes', { translationX: -40, velocityX: -100 });
    await pasarTiempo();

    expect(p.alCambiar).not.toHaveBeenCalled();
  });

  it('sin lote vecino no cambia', async () => {
    const p = props({ haySiguiente: false, hayAnterior: false });
    await render(
      <DeslizarLotes {...p}>
        <Texto>Ficha</Texto>
      </DeslizarLotes>,
      { wrapper: Raiz },
    );

    await arrastrar('gesto-deslizar-lotes', { translationX: -300, velocityX: -900 });
    await arrastrar('gesto-deslizar-lotes', { translationX: 300, velocityX: 900 });
    await pasarTiempo();

    expect(p.alCambiar).not.toHaveBeenCalled();
  });

  it('los botones «Lote anterior» y «Lote siguiente» hacen lo mismo que el gesto', async () => {
    const p = props();
    await render(
      <DeslizarLotes {...p}>
        <Texto>Ficha</Texto>
      </DeslizarLotes>,
      { wrapper: Raiz },
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Lote siguiente' }));
    await pasarTiempo();
    expect(p.alCambiar).toHaveBeenLastCalledWith('siguiente');

    await fireEvent.press(screen.getByRole('button', { name: 'Lote anterior' }));
    await pasarTiempo();
    expect(p.alCambiar).toHaveBeenLastCalledWith('anterior');
  });

  it('los botones se deshabilitan sin vecino y se anuncia la posición', async () => {
    await render(
      <DeslizarLotes {...props({ hayAnterior: false })}>
        <Texto>Ficha</Texto>
      </DeslizarLotes>,
      { wrapper: Raiz },
    );

    expect(
      screen.getByRole('button', { name: 'Lote anterior' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
    expect(screen.getByText('Lote 2 de 3').props.accessibilityLiveRegion).toBe('polite');
  });

  it('cuando cambia el lote, la ficha nueva entra sin romper el árbol', async () => {
    const p = props();
    const { rerender } = await render(
      <DeslizarLotes {...p}>
        <Texto>Ficha A</Texto>
      </DeslizarLotes>,
      {
        wrapper: Raiz,
      },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Lote siguiente' }));
    await pasarTiempo();

    await rerender(
      <DeslizarLotes {...p} claveActual="b">
        <Texto>Ficha B</Texto>
      </DeslizarLotes>,
    );
    await pasarTiempo();

    expect(screen.getByText('Ficha B')).toBeTruthy();
  });
});
