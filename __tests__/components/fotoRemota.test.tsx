import { fireEvent, render, screen } from '@testing-library/react-native';
import { FilaLabor } from '@/components/FilaLabor';
import { VisorFoto } from '@/components/VisorFoto';
import { Raiz } from '../helpers/gestos';
import { laborFila } from '../helpers/filas';

const URL_REMOTA = 'https://blob.test/a.jpg';

function fila(cambios = {}) {
  return (
    <Raiz>
      <FilaLabor
        labor={laborFila(cambios)}
        alEditar={jest.fn()}
        alDuplicar={jest.fn()}
        alBorrar={jest.fn()}
        alVerFoto={jest.fn()}
      />
    </Raiz>
  );
}

describe('fotos que vienen del servidor (D84)', () => {
  it('una labor con foto solo en el servidor (otro teléfono) muestra la miniatura', async () => {
    await render(fila({ foto_uri: null, foto_url: URL_REMOTA }));

    expect(
      screen.getByRole('imagebutton', { name: /Ver la foto de la labor de riego/ }),
    ).toBeTruthy();
    expect(screen.getByTestId('miniatura-foto').props.source).toEqual({ uri: URL_REMOTA });
  });

  it('si hay foto local y del servidor, se prefiere la local (no se descarga otra vez)', async () => {
    await render(fila({ foto_uri: 'file:///permanente/a.jpg', foto_url: URL_REMOTA }));

    expect(screen.getByTestId('miniatura-foto').props.source).toEqual({
      uri: 'file:///permanente/a.jpg',
    });
  });

  it('sin ninguna foto no hay miniatura', async () => {
    await render(fila({ foto_uri: null, foto_url: null }));

    expect(screen.queryByRole('imagebutton')).toBeNull();
  });

  it('si la miniatura no carga, dice «Foto no disponible» en vez de dejar un hueco vacío', async () => {
    await render(fila({ foto_uri: null, foto_url: URL_REMOTA }));

    await fireEvent(screen.getByTestId('miniatura-foto'), 'error');

    expect(screen.getByText('Foto no disponible')).toBeTruthy();
    expect(screen.queryByTestId('miniatura-foto')).toBeNull();
  });

  it('el visor avisa si la foto no se puede cargar y deja los botones', async () => {
    await render(<VisorFoto uri={URL_REMOTA} descripcion="Foto de prueba" />, { wrapper: Raiz });

    await fireEvent(screen.getByTestId('foto-ampliable'), 'error');

    expect(screen.getByText('Foto no disponible')).toBeTruthy();
    expect(screen.getByText('No se pudo cargar la foto. Revisa tu conexión.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acercar la foto' })).toBeTruthy();
  });

  it('«Reintentar» vuelve a pedir la foto', async () => {
    await render(<VisorFoto uri={URL_REMOTA} descripcion="Foto de prueba" />, { wrapper: Raiz });
    await fireEvent(screen.getByTestId('foto-ampliable'), 'error');

    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByTestId('foto-ampliable')).toBeTruthy();
    expect(screen.queryByText('Foto no disponible')).toBeNull();
  });

  it('mientras carga muestra la silueta y, al llegar, la quita', async () => {
    await render(<VisorFoto uri={URL_REMOTA} descripcion="Foto de prueba" />, { wrapper: Raiz });

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.getByText('Cargando foto…')).toBeTruthy();

    await fireEvent(screen.getByTestId('foto-ampliable'), 'load');

    expect(screen.queryByRole('progressbar', { name: 'Cargando' })).toBeNull();
  });
});
