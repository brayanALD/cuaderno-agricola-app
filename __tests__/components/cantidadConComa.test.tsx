import { render, screen } from '@testing-library/react-native';
import { ControlCantidad } from '@/components/ControlCantidad';
import { FilaLabor } from '@/components/FilaLabor';
import { Raiz } from '../helpers/gestos';
import { laborFila } from '../helpers/filas';

describe('cantidades con coma decimal (H3)', () => {
  it('la fila de una labor muestra «8,25 kg», no «8.25 kg», y así lo lee el lector de pantalla', async () => {
    await render(
      <Raiz>
        <FilaLabor
          labor={laborFila({ tipo: 'cosecha', cantidad: 8.25, unidad: 'kg' })}
          alEditar={jest.fn()}
          alDuplicar={jest.fn()}
          alBorrar={jest.fn()}
        />
      </Raiz>,
    );

    expect(screen.getByText('8,25 kg')).toBeTruthy();
    expect(screen.queryByText('8.25 kg')).toBeNull();
    expect(
      screen.getByRole('button', { name: /8,25 kg(\. Pendiente de enviar)?\. Editar$/ }),
    ).toBeTruthy();
  });

  it('una cantidad entera no cambia («7 L»)', async () => {
    await render(
      <Raiz>
        <FilaLabor
          labor={laborFila({ cantidad: 7, unidad: 'L' })}
          alEditar={jest.fn()}
          alDuplicar={jest.fn()}
          alBorrar={jest.fn()}
        />
      </Raiz>,
    );

    expect(screen.getByText('7 L')).toBeTruthy();
  });

  it('el control de cantidad muestra el valor con coma', async () => {
    await render(<ControlCantidad etiqueta="Cantidad" valor={5.1} onChange={jest.fn()} />, {
      wrapper: Raiz,
    });

    expect(screen.getByLabelText('Cantidad').props.value).toBe('5,1');
  });
});
