import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { CuadernoProvider, useCuaderno } from '@/context/CuadernoContext';
import type { Contexto } from '@/services/contexto';
import { crearContextoDePrueba } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';

const pantallaDeError = (reintentar: () => void, error: Error) => (
  <>
    <Text>{error.message}</Text>
    <Pressable onPress={reintentar}>
      <Text>Reintentar</Text>
    </Pressable>
  </>
);

describe('CuadernoProvider', () => {
  it('muestra el estado de carga mientras abre y luego los hijos', async () => {
    const ctx = await crearContextoDePrueba();
    let terminarApertura: (ctx: Contexto) => void = () => undefined;
    const abrir = () =>
      new Promise<Contexto>((resolve) => {
        terminarApertura = resolve;
      });

    await render(
      <CuadernoProvider abrir={abrir} cargando={<Text>Cargando</Text>} alError={pantallaDeError}>
        <Text>Listo</Text>
      </CuadernoProvider>,
    );

    expect(screen.getByText('Cargando')).toBeTruthy();
    expect(screen.queryByText('Listo')).toBeNull();

    await act(async () => {
      terminarApertura(ctx);
    });

    expect(await screen.findByText('Listo')).toBeTruthy();
    expect(screen.queryByText('Cargando')).toBeNull();
  });

  it('si no se puede abrir muestra el error y deja reintentar', async () => {
    const ctx = await crearContextoDePrueba();
    let intentos = 0;
    const abrir = () =>
      ++intentos === 1 ? Promise.reject(new Error('Disco lleno')) : Promise.resolve(ctx);

    await render(
      <CuadernoProvider abrir={abrir} cargando={<Text>Cargando</Text>} alError={pantallaDeError}>
        <Text>Listo</Text>
      </CuadernoProvider>,
    );

    expect(await screen.findByText('Disco lleno')).toBeTruthy();
    await fireEvent.press(screen.getByText('Reintentar'));
    expect(await screen.findByText('Listo')).toBeTruthy();
    expect(intentos).toBe(2);
  });

  it('convierte un rechazo que no es Error en un Error con su texto', async () => {
    const abrir = () => Promise.reject('sin permisos');

    await render(
      <CuadernoProvider abrir={abrir} cargando={null} alError={pantallaDeError}>
        <Text>Listo</Text>
      </CuadernoProvider>,
    );

    expect(await screen.findByText('sin permisos')).toBeTruthy();
  });

  it('no actualiza el estado si se desmonta antes de terminar de abrir', async () => {
    const ctx = await crearContextoDePrueba();
    const errores = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let terminarApertura: (ctx: Contexto) => void = () => undefined;
    const abrir = () =>
      new Promise<Contexto>((resolve) => {
        terminarApertura = resolve;
      });
    await render(
      <CuadernoProvider abrir={abrir} cargando={null} alError={pantallaDeError}>
        <Text>Listo</Text>
      </CuadernoProvider>,
    );

    await screen.unmount();
    await act(async () => {
      terminarApertura(ctx);
    });

    expect(errores).not.toHaveBeenCalled();
    errores.mockRestore();
  });
});

describe('useCuaderno', () => {
  it('entrega el contexto y una versión que sube con cada invalidación', async () => {
    const ctx = await crearContextoDePrueba();

    const { result } = await renderHook(() => useCuaderno(), { wrapper: crearEnvoltorio(ctx) });
    await act(async () => undefined);

    expect(result.current.ctx).toBe(ctx);
    expect(result.current.version).toBe(0);

    await act(async () => {
      result.current.invalidar();
    });

    expect(result.current.version).toBe(1);
  });

  it('lanza un error claro si se usa fuera del proveedor', async () => {
    const errores = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useCuaderno())).rejects.toThrow(
      'useCuaderno debe usarse dentro de <CuadernoProvider>.',
    );

    errores.mockRestore();
  });
});
