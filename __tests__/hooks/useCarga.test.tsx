import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCuaderno } from '@/context/CuadernoContext';
import { listaVacia, useCarga } from '@/hooks/useCarga';
import { crearContextoDePrueba } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';

async function montar<T>(cargar: () => Promise<T | null>, esVacio?: (datos: T) => boolean) {
  const ctx = await crearContextoDePrueba();
  const cargarConContexto = (): Promise<T | null> => cargar();
  return renderHook(
    () => ({ carga: useCarga(cargarConContexto, esVacio), cuaderno: useCuaderno() }),
    { wrapper: crearEnvoltorio(ctx) },
  );
}

describe('useCarga', () => {
  it('pasa de «cargando» a «listo» con los datos', async () => {
    let entregar: (datos: number[]) => void = () => undefined;
    const { result } = await montar(
      () =>
        new Promise<number[]>((resolve) => {
          entregar = resolve;
        }),
      listaVacia,
    );

    expect(result.current.carga.vista).toEqual({ estado: 'cargando' });

    await act(async () => {
      entregar([1, 2, 3]);
    });

    expect(result.current.carga.vista).toEqual({ estado: 'listo', datos: [1, 2, 3] });
  });

  it('una lista vacía es «vacío»', async () => {
    const { result } = await montar(() => Promise.resolve<number[]>([]), listaVacia);

    await waitFor(() => expect(result.current.carga.vista).toEqual({ estado: 'vacio' }));
  });

  it('null (no encontrado) también es «vacío»', async () => {
    const { result } = await montar(() => Promise.resolve(null));

    await waitFor(() => expect(result.current.carga.vista).toEqual({ estado: 'vacio' }));
  });

  it('un fallo es «error» y reintentar vuelve a cargar', async () => {
    let intentos = 0;
    const { result } = await montar(() =>
      ++intentos === 1 ? Promise.reject(new Error('Sin base')) : Promise.resolve('ok'),
    );

    await waitFor(() => expect(result.current.carga.vista.estado).toBe('error'));
    expect(result.current.carga.vista).toMatchObject({ error: new Error('Sin base') });

    await act(async () => {
      result.current.carga.reintentar();
    });

    await waitFor(() =>
      expect(result.current.carga.vista).toEqual({ estado: 'listo', datos: 'ok' }),
    );
    expect(intentos).toBe(2);
  });

  it('un rechazo que no es Error se convierte en Error', async () => {
    const { result } = await montar(() => Promise.reject('texto suelto'));

    await waitFor(() => expect(result.current.carga.vista.estado).toBe('error'));
    expect(result.current.carga.vista).toMatchObject({ error: new Error('texto suelto') });
  });

  it('al invalidar recarga sin volver a «cargando» (se conservan los datos viejos)', async () => {
    let valor = 1;
    const ctx = await crearContextoDePrueba();
    const cargar = () => Promise.resolve(valor);
    const historial: string[] = [];
    const { result } = await renderHook(
      () => {
        const carga = useCarga(cargar);
        historial.push(carga.vista.estado);
        return { carga, cuaderno: useCuaderno() };
      },
      { wrapper: crearEnvoltorio(ctx) },
    );
    await waitFor(() => expect(result.current.carga.vista).toEqual({ estado: 'listo', datos: 1 }));
    const rendersAntes = historial.length;

    valor = 2;
    await act(async () => {
      result.current.cuaderno.invalidar();
    });

    await waitFor(() => expect(result.current.carga.vista).toEqual({ estado: 'listo', datos: 2 }));
    expect(historial.slice(rendersAntes)).not.toContain('cargando');
  });

  describe('cuando cambia la consulta (otro lote, otro texto)', () => {
    async function conConsultas(opciones?: { conservarAlCambiar: boolean }) {
      const ctx = await crearContextoDePrueba();
      let entregarB: (valor: string) => void = () => undefined;
      const cargarA = () => Promise.resolve('datos de A');
      const cargarB = () =>
        new Promise<string>((resolve) => {
          entregarB = resolve;
        });
      const montado = await renderHook(
        ({ cargar }: { cargar: () => Promise<string> }) => useCarga(cargar, undefined, opciones),
        { wrapper: crearEnvoltorio(ctx), initialProps: { cargar: cargarA } },
      );
      await waitFor(() =>
        expect(montado.result.current.vista).toEqual({ estado: 'listo', datos: 'datos de A' }),
      );
      return { ...montado, cargarB, entregarB: (valor: string) => entregarB(valor) };
    }

    it('por defecto vuelve a «cargando»: no se muestran datos de la consulta anterior', async () => {
      const { result, rerender, cargarB, entregarB } = await conConsultas();

      await rerender({ cargar: cargarB });

      expect(result.current.vista).toEqual({ estado: 'cargando' });
      await act(async () => {
        entregarB('datos de B');
      });
      expect(result.current.vista).toEqual({ estado: 'listo', datos: 'datos de B' });
    });

    it('con conservarAlCambiar mantiene los datos viejos hasta que llegan los nuevos (buscador)', async () => {
      const { result, rerender, cargarB, entregarB } = await conConsultas({
        conservarAlCambiar: true,
      });

      await rerender({ cargar: cargarB });

      expect(result.current.vista).toEqual({ estado: 'listo', datos: 'datos de A' });
      await act(async () => {
        entregarB('datos de B');
      });
      expect(result.current.vista).toEqual({ estado: 'listo', datos: 'datos de B' });
    });
  });

  it('descarta la respuesta de una carga que quedó obsoleta', async () => {
    const respuestas: ((valor: string) => void)[] = [];
    const { result } = await montar(
      () =>
        new Promise<string>((resolve) => {
          respuestas.push(resolve);
        }),
    );
    await waitFor(() => expect(respuestas).toHaveLength(1));

    await act(async () => {
      result.current.cuaderno.invalidar();
    });
    await waitFor(() => expect(respuestas).toHaveLength(2));

    await act(async () => {
      respuestas[1]?.('nueva');
      respuestas[0]?.('vieja');
    });

    expect(result.current.carga.vista).toEqual({ estado: 'listo', datos: 'nueva' });
  });
});
