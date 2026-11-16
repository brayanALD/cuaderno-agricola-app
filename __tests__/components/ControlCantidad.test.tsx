import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { ControlCantidad } from '@/components/ControlCantidad';
import { Texto } from '@/components/Texto';
import { arrastrar, Raiz } from '../helpers/gestos';

describe('ControlCantidad (gesto: arrastre vertical)', () => {
  function Prueba({ inicial = 5, max }: { inicial?: number; max?: number }) {
    const [valor, setValor] = useState(inicial);
    return (
      <>
        <ControlCantidad
          etiqueta="Cantidad"
          valor={valor}
          onChange={setValor}
          unidad="kg"
          max={max}
        />
        <Texto testID="valor">{String(valor)}</Texto>
      </>
    );
  }

  it('arrastrar hacia arriba aumenta y hacia abajo disminuye, de a un paso cada 24 px', async () => {
    await render(<Prueba />, { wrapper: Raiz });

    await arrastrar('gesto-cantidad', { translationY: -72 });
    expect(screen.getByTestId('valor').props.children).toBe('8');

    await arrastrar('gesto-cantidad', { translationY: 48 });
    expect(screen.getByTestId('valor').props.children).toBe('6');
  });

  it('nunca baja de cero ni pasa del máximo', async () => {
    await render(<Prueba inicial={2} max={4} />, { wrapper: Raiz });

    await arrastrar('gesto-cantidad', { translationY: 500 });
    expect(screen.getByTestId('valor').props.children).toBe('0');

    await arrastrar('gesto-cantidad', { translationY: -500 });
    expect(screen.getByTestId('valor').props.children).toBe('4');
  });

  it('un arrastre menor a medio paso no cambia nada', async () => {
    const alCambiar = jest.fn();
    await render(<ControlCantidad etiqueta="Cantidad" valor={5} onChange={alCambiar} />, {
      wrapper: Raiz,
    });

    await arrastrar('gesto-cantidad', { translationY: -8 });

    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('la alternativa por botón: «Aumentar cantidad» y «Disminuir cantidad»', async () => {
    await render(<Prueba />, { wrapper: Raiz });

    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Disminuir cantidad' }));

    expect(screen.getByTestId('valor').props.children).toBe('6');
  });

  it('«Disminuir» se deshabilita en 0 y «Aumentar» en el máximo', async () => {
    await render(<Prueba inicial={0} max={0} />, { wrapper: Raiz });

    expect(
      screen.getByRole('button', { name: 'Disminuir cantidad' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
    expect(
      screen.getByRole('button', { name: 'Aumentar cantidad' }).props.accessibilityState,
    ).toMatchObject({
      disabled: true,
    });
  });

  it('también se puede escribir, con coma o punto, y se ignora lo inválido', async () => {
    await render(<Prueba />, { wrapper: Raiz });
    const campo = screen.getByLabelText('Cantidad');

    await fireEvent.changeText(campo, '12,75');
    expect(screen.getByTestId('valor').props.children).toBe('12.75');

    await fireEvent.changeText(campo, 'abc');
    expect(screen.getByTestId('valor').props.children).toBe('12.75');

    await fireEvent.changeText(campo, '-3');
    expect(screen.getByTestId('valor').props.children).toBe('12.75');

    await fireEvent.changeText(campo, '');
    expect(screen.getByTestId('valor').props.children).toBe('12.75');
  });

  it('al salir del campo vuelve a mostrar el valor válido', async () => {
    await render(<Prueba />, { wrapper: Raiz });
    const campo = screen.getByLabelText('Cantidad');

    await fireEvent.changeText(campo, 'abc');
    expect(screen.getByLabelText('Cantidad').props.value).toBe('abc');
    await fireEvent(campo, 'blur');

    expect(screen.getByLabelText('Cantidad').props.value).toBe('5');
  });

  it('el paso decimal se respeta con los botones', async () => {
    const alCambiar = jest.fn();
    await render(
      <ControlCantidad etiqueta="Cantidad" valor={1} onChange={alCambiar} paso={0.5} />,
      {
        wrapper: Raiz,
      },
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar cantidad' }));

    expect(alCambiar).toHaveBeenCalledWith(1.5);
  });

  it('muestra la unidad y el error', async () => {
    await render(
      <ControlCantidad
        etiqueta="Cantidad"
        valor={1}
        onChange={jest.fn()}
        unidad="kg"
        error="Debe ser ≥ 0."
      />,
      {
        wrapper: Raiz,
      },
    );

    expect(screen.getByText('kg')).toBeTruthy();
    expect(screen.getByText('Debe ser ≥ 0.')).toBeTruthy();
  });
});
