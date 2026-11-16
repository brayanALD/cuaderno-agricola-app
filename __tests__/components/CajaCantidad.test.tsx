import { render, screen, within } from '@testing-library/react-native';
import { TextInput } from 'react-native';
import { ControlCantidad } from '@/components/ControlCantidad';
import { arrastrar, Raiz, tocar } from '../helpers/gestos';

describe('CajaCantidad: tocar para escribir y arrastrar sobre el número (H1)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('un toque sobre el número enfoca el campo (abre el teclado)', async () => {
    const enfocar = jest.spyOn(TextInput.prototype, 'focus');
    enfocar.mockClear(); // el mock de `focus` es compartido: no arrastrar llamadas de otras pruebas
    await render(<ControlCantidad etiqueta="Cantidad" valor={5} onChange={jest.fn()} />, {
      wrapper: Raiz,
    });

    await tocar('gesto-tocar-cantidad');

    expect(enfocar).toHaveBeenCalledTimes(1);
  });

  it('arrastrar NO enfoca el campo (no se abre el teclado al cambiar el valor)', async () => {
    const enfocar = jest.spyOn(TextInput.prototype, 'focus');
    enfocar.mockClear(); // el mock de `focus` es compartido: no arrastrar llamadas de otras pruebas
    await render(<ControlCantidad etiqueta="Cantidad" valor={5} onChange={jest.fn()} />, {
      wrapper: Raiz,
    });

    await arrastrar('gesto-cantidad', { translationY: -48 });

    expect(enfocar).not.toHaveBeenCalled();
  });

  it('el campo va dentro de un contenedor que no recibe toques: en Android el campo nativo ignora `pointerEvents`, un View no', async () => {
    await render(<ControlCantidad etiqueta="Cantidad" valor={5} onChange={jest.fn()} />, {
      wrapper: Raiz,
    });

    const contenedor = screen.getByTestId('campo-cantidad-inerte');
    expect(contenedor.props.pointerEvents).toBe('none');
    expect(within(contenedor).getByLabelText('Cantidad')).toBeTruthy();
  });

  it('el campo sigue siendo accesible con su etiqueta y su ayuda', async () => {
    await render(<ControlCantidad etiqueta="Cantidad" valor={5} onChange={jest.fn()} />, {
      wrapper: Raiz,
    });

    expect(screen.getByLabelText('Cantidad').props.accessibilityHint).toBe(
      'Toca para escribir el valor, arrastra o usa los botones más y menos',
    );
  });
});
