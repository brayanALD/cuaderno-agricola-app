import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';
import { FilaLabor } from '@/components/FilaLabor';
import { laborFila } from '../helpers/filas';
import { Raiz } from '../helpers/gestos';

describe('FilaLabor (gesto: mantener presionado)', () => {
  const acciones = () => ({
    alEditar: jest.fn(),
    alDuplicar: jest.fn(),
    alBorrar: jest.fn(),
    alVerFoto: jest.fn(),
  });

  it('mantener presionada la fila la duplica', async () => {
    const a = acciones();
    await render(<FilaLabor labor={laborFila({ id: 'x1' })} {...a} />, { wrapper: Raiz });

    const controlador = createGestureController('gesto-duplicar-x1');
    await act(async () => {
      controlador.begin();
      controlador.activate();
      controlador.end();
    });

    expect(a.alDuplicar).toHaveBeenCalledWith('x1');
  });

  it('un toque corto (el gesto falla) no duplica', async () => {
    const a = acciones();
    await render(<FilaLabor labor={laborFila({ id: 'x1' })} {...a} />, { wrapper: Raiz });

    const controlador = createGestureController('gesto-duplicar-x1');
    await act(async () => {
      controlador.begin();
      controlador.fail();
    });

    expect(a.alDuplicar).not.toHaveBeenCalled();
  });

  it('el menú ⋮ nombra la labor y su opción «Duplicar» es la alternativa visible al gesto', async () => {
    const a = acciones();
    await render(<FilaLabor labor={laborFila({ id: 'x1', fecha: '2026-11-10' })} {...a} />, {
      wrapper: Raiz,
    });

    await fireEvent.press(
      screen.getByRole('button', {
        name: 'Más acciones de la labor de riego del 10 de noviembre de 2026',
      }),
    );
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Duplicar con la fecha de hoy' }));

    expect(a.alDuplicar).toHaveBeenCalledWith('x1');
  });

  it('tocar la fila edita y borrar está en el menú, aparte de las demás acciones', async () => {
    const a = acciones();
    await render(<FilaLabor labor={laborFila({ id: 'x1' })} {...a} />, { wrapper: Raiz });

    await fireEvent.press(screen.getByRole('button', { name: /Editar$/ }));
    expect(screen.queryByRole('menuitem', { name: 'Borrar la labor' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: /^Más acciones de la labor/ }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Borrar la labor' }));

    expect(a.alEditar).toHaveBeenCalledWith('x1');
    expect(a.alBorrar).toHaveBeenCalledWith('x1');
  });

  it('el lector de pantalla tiene acciones propias para duplicar y borrar (sin gestos ni menús)', async () => {
    const a = acciones();
    await render(<FilaLabor labor={laborFila({ id: 'x1' })} {...a} />, { wrapper: Raiz });

    const fila = screen.getByRole('button', { name: /Editar$/ });
    expect(fila.props.accessibilityActions).toEqual([
      { name: 'duplicar', label: 'Duplicar con la fecha de hoy' },
      { name: 'borrar', label: 'Borrar la labor' },
    ]);
    await act(async () => {
      fila.props.onAccessibilityAction({ nativeEvent: { actionName: 'duplicar' } });
      fila.props.onAccessibilityAction({ nativeEvent: { actionName: 'borrar' } });
    });

    expect(a.alDuplicar).toHaveBeenCalledWith('x1');
    expect(a.alBorrar).toHaveBeenCalledWith('x1');
  });

  it('la fila avisa por accesibilidad cómo duplicarla y lee la cantidad', async () => {
    await render(<FilaLabor labor={laborFila({ cantidad: 20, unidad: 'L' })} {...acciones()} />, {
      wrapper: Raiz,
    });

    const fila = screen.getByRole('button', { name: /Editar$/ });
    expect(fila.props.accessibilityLabel).toContain('20 L');
    expect(fila.props.accessibilityHint).toContain('Mantén presionado');
  });

  it('muestra nota, luz y foto con botón para verla', async () => {
    const a = acciones();
    await render(
      <FilaLabor
        labor={laborFila({
          id: 'x1',
          nota: 'Goteo en la zona alta',
          luz: 'nublado',
          foto_uri: 'file:///f.jpg',
        })}
        {...a}
      />,
      { wrapper: Raiz },
    );

    expect(screen.getByText('Goteo en la zona alta')).toBeTruthy();
    expect(screen.getByText('Nublado')).toBeTruthy();
    await fireEvent.press(screen.getByRole('imagebutton', { name: /Ver la foto/ }));

    expect(a.alVerFoto).toHaveBeenCalledWith('x1');
  });

  it('sin foto, sin nota y sin cantidad no muestra esos bloques', async () => {
    await render(
      <FilaLabor
        labor={laborFila({ cantidad: 0, unidad: null, nota: null, luz: null, foto_uri: null })}
        {...acciones()}
      />,
      { wrapper: Raiz },
    );

    expect(screen.queryByRole('imagebutton')).toBeNull();
    expect(screen.getByRole('button', { name: /Editar$/ }).props.accessibilityLabel).not.toContain(
      ', 0',
    );
  });
});
