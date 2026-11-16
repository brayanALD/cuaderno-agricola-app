import { act, renderHook } from '@testing-library/react-native';
import { useGaleria } from '@/hooks/useGaleria';
import { crearContextoDePrueba } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { crearFotosEnMemoria } from '../helpers/fotosEnMemoria';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const { launchImageLibraryAsync } = jest.requireMock<{ launchImageLibraryAsync: jest.Mock }>(
  'expo-image-picker',
);

beforeEach(() => {
  launchImageLibraryAsync.mockReset();
});

async function montar(fotos = crearFotosEnMemoria()) {
  const ctx = { ...(await crearContextoDePrueba()), fotos };
  const hook = await renderHook(() => useGaleria(), { wrapper: crearEnvoltorio(ctx) });
  await act(async () => undefined);
  return { ...hook, fotos };
}

describe('useGaleria (D34, D83: fotos de la galería)', () => {
  it('devuelve la ruta de la COPIA PERMANENTE, no la de la caché del selector', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/ImagePicker/riego.jpg' }],
    });
    const { result, fotos } = await montar();
    fotos.sembrar('file:///cache/ImagePicker/riego.jpg');

    let uri: string | null = null;
    await act(async () => {
      uri = await result.current.elegir();
    });

    expect(uri).toBe('file:///permanente/id-1.jpg');
    expect(fotos.archivos.has('file:///permanente/id-1.jpg')).toBe(true);
    expect(launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    expect(result.current.error).toBeNull();
  });

  it('si el usuario cancela, devuelve null sin error y no guarda nada', async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    const { result, fotos } = await montar();

    let uri: string | null = 'x';
    await act(async () => {
      uri = await result.current.elegir();
    });

    expect(uri).toBeNull();
    expect(result.current.error).toBeNull();
    expect(fotos.archivos.size).toBe(0);
  });

  it('si la galería falla, devuelve null y explica el problema (la app no se rompe)', async () => {
    launchImageLibraryAsync.mockRejectedValue(new Error('Sin acceso'));
    const { result } = await montar();

    let uri: string | null = 'x';
    await act(async () => {
      uri = await result.current.elegir();
    });

    expect(uri).toBeNull();
    expect(result.current.error).toBe('No se pudo abrir la galería. Intenta de nuevo.');
  });

  it('si no se puede reducir y guardar la foto, devuelve null y lo explica', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///cache/ImagePicker/riego.jpg' }],
    });
    const fotos = crearFotosEnMemoria();
    jest.spyOn(fotos, 'guardar').mockRejectedValue(new Error('Sin espacio'));
    const { result } = await montar(fotos);

    let uri: string | null = 'x';
    await act(async () => {
      uri = await result.current.elegir();
    });

    expect(uri).toBeNull();
    expect(result.current.error).toBe('No se pudo preparar la foto. Intenta de nuevo.');
  });

  it('un intento nuevo limpia el error anterior', async () => {
    launchImageLibraryAsync.mockRejectedValueOnce(new Error('Sin acceso'));
    launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    const { result } = await montar();
    await act(async () => {
      await result.current.elegir();
    });

    await act(async () => {
      await result.current.elegir();
    });

    expect(result.current.error).toBeNull();
  });
});
