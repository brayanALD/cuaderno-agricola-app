import { act, renderHook } from '@testing-library/react-native';
import { useCuaderno } from '@/context/CuadernoContext';
import { crearContextoDePrueba } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';

async function montar() {
  const ctx = await crearContextoDePrueba();
  const resultado = await renderHook(() => useCuaderno(), { wrapper: crearEnvoltorio(ctx) });
  await act(async () => undefined);
  return resultado;
}

describe('useCuaderno: cambios del usuario y refrescos', () => {
  it('invalidar (una escritura del usuario) sube la versión y cuenta un cambio local', async () => {
    const { result } = await montar();
    expect(result.current.cambiosLocales).toBe(0);

    await act(async () => {
      result.current.invalidar();
    });

    expect(result.current.version).toBe(1);
    expect(result.current.cambiosLocales).toBe(1);
  });

  it('refrescar (lo que escribe la sincronización) sube la versión SIN contar un cambio local', async () => {
    const { result } = await montar();

    await act(async () => {
      result.current.refrescar();
    });

    expect(result.current.version).toBe(1);
    expect(result.current.cambiosLocales).toBe(0);
  });

  it('invalidar y refrescar son estables entre renders (se pueden usar como dependencias)', async () => {
    const { result, rerender } = await montar();
    const { invalidar, refrescar } = result.current;

    await act(async () => {
      result.current.refrescar();
    });
    await rerender(undefined);

    expect(result.current.invalidar).toBe(invalidar);
    expect(result.current.refrescar).toBe(refrescar);
  });
});
