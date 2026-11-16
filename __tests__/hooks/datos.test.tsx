import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAcciones } from '@/hooks/useAcciones';
import {
  useLaboresDeLote,
  useLaboresRecientes,
  useProduccion,
  useProximaLabor,
} from '@/hooks/useLabores';
import { useBusqueda, useLote, useLotes } from '@/hooks/useLotes';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';

async function montar<T>(hook: () => T) {
  const ctx = await crearContextoDePrueba();
  const montado = await renderHook(hook, { wrapper: crearEnvoltorio(ctx) });
  return { ...montado, ctx };
}

describe('useLotes y useAcciones', () => {
  it('empieza vacío y se actualiza solo al crear un lote (versión de Context)', async () => {
    const { result } = await montar(() => ({ lotes: useLotes(), acciones: useAcciones() }));
    await waitFor(() => expect(result.current.lotes.vista).toEqual({ estado: 'vacio' }));

    await act(async () => {
      const resultado = await result.current.acciones.crearLote(datosLote());
      expect(resultado.ok).toBe(true);
    });

    await waitFor(() => expect(result.current.lotes.vista.estado).toBe('listo'));
    const vista = result.current.lotes.vista;
    expect(vista.estado === 'listo' && vista.datos[0]).toMatchObject({
      nombre: 'El Mirador',
      dias_desde_siembra: 90,
    });
  });

  it('un fallo de validación devuelve los errores y no recarga nada', async () => {
    const { result } = await montar(() => ({
      lotes: useLotes(),
      acciones: useAcciones(),
    }));
    await waitFor(() => expect(result.current.lotes.vista.estado).toBe('vacio'));

    let resultado: Awaited<ReturnType<typeof result.current.acciones.crearLote>> | undefined;
    await act(async () => {
      resultado = await result.current.acciones.crearLote(datosLote({ area_m2: 0 }));
    });

    expect(resultado).toMatchObject({ ok: false, errores: { area_m2: expect.any(String) } });
    expect(result.current.lotes.vista).toEqual({ estado: 'vacio' });
  });

  it('filtra por texto', async () => {
    const ctx = await crearContextoDePrueba();
    const envoltorio = crearEnvoltorio(ctx);
    const acciones = await renderHook(() => useAcciones(), { wrapper: envoltorio });
    await act(async () => {
      await acciones.result.current.crearLote(datosLote({ nombre: 'Uno', cultivo: 'Café' }));
      await acciones.result.current.crearLote(datosLote({ nombre: 'Dos', cultivo: 'Aguacate' }));
    });

    const { result } = await renderHook(() => useLotes('aguacate'), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.vista.estado).toBe('listo'));
    const vista = result.current.vista;
    expect(vista.estado === 'listo' && vista.datos.map((l) => l.nombre)).toEqual(['Dos']);
  });

  it('borrar un lote lo quita de la lista', async () => {
    const { result } = await montar(() => ({ lotes: useLotes(), acciones: useAcciones() }));
    await act(async () => {
      await result.current.acciones.crearLote(datosLote());
    });
    await waitFor(() => expect(result.current.lotes.vista.estado).toBe('listo'));

    await act(async () => {
      expect(await result.current.acciones.borrarLote('id-1')).toBe(true);
    });

    await waitFor(() => expect(result.current.lotes.vista).toEqual({ estado: 'vacio' }));
  });

  it('useLote da «vacío» si el lote no existe y los datos si existe', async () => {
    const { result } = await montar(() => ({
      inexistente: useLote('nada'),
      existente: useLote('id-1'),
      acciones: useAcciones(),
    }));
    await waitFor(() => expect(result.current.inexistente.vista).toEqual({ estado: 'vacio' }));

    await act(async () => {
      await result.current.acciones.crearLote(datosLote());
    });

    await waitFor(() => expect(result.current.existente.vista.estado).toBe('listo'));
    expect(result.current.inexistente.vista).toEqual({ estado: 'vacio' });
  });

  it('actualizarLote cambia el dato y recarga', async () => {
    const { result } = await montar(() => ({ lote: useLote('id-1'), acciones: useAcciones() }));
    await act(async () => {
      await result.current.acciones.crearLote(datosLote());
    });
    await waitFor(() => expect(result.current.lote.vista.estado).toBe('listo'));

    await act(async () => {
      await result.current.acciones.actualizarLote('id-1', datosLote({ area_m2: 9000 }));
    });

    await waitFor(() => {
      const vista = result.current.lote.vista;
      expect(vista.estado === 'listo' && vista.datos.area_m2).toBe(9000);
    });
  });
});

describe('hooks de labores, producción y búsqueda', () => {
  async function montarConLote() {
    const montado = await montar(() => ({
      porLote: useLaboresDeLote('id-1'),
      recientes: useLaboresRecientes(5),
      produccion: useProduccion('id-1'),
      sugerencia: useProximaLabor('id-1'),
      busqueda: useBusqueda('zanja'),
      acciones: useAcciones(),
    }));
    await act(async () => {
      await montado.result.current.acciones.crearLote(datosLote());
    });
    return montado;
  }

  it('las labores, la producción y la sugerencia se actualizan al registrar una labor', async () => {
    const { result } = await montarConLote();
    await waitFor(() => expect(result.current.porLote.vista).toEqual({ estado: 'vacio' }));

    await act(async () => {
      await result.current.acciones.crearLabor(
        'id-1',
        datosLabor({ tipo: 'cosecha', cantidad: 12.5 }),
      );
      await result.current.acciones.crearLabor(
        'id-1',
        datosLabor({ tipo: 'cosecha', cantidad: 8.25 }),
      );
    });

    await waitFor(() => expect(result.current.porLote.vista.estado).toBe('listo'));
    await waitFor(() => {
      const vista = result.current.produccion.vista;
      expect(vista.estado === 'listo' && vista.datos.totalKg).toBe(20.75);
    });
    expect(result.current.recientes.vista.estado).toBe('listo');
    expect(result.current.sugerencia.vista.estado).toBe('listo');
  });

  it('duplicar y borrar una labor se reflejan en la lista', async () => {
    const { result } = await montarConLote();
    await act(async () => {
      await result.current.acciones.crearLabor('id-1', datosLabor({ fecha: '2026-11-01' }));
    });
    await waitFor(() => expect(result.current.porLote.vista.estado).toBe('listo'));

    await act(async () => {
      expect((await result.current.acciones.duplicarLabor('id-2')).ok).toBe(true);
    });
    await waitFor(() => {
      const vista = result.current.porLote.vista;
      expect(vista.estado === 'listo' && vista.datos.map((l) => l.fecha)).toEqual([
        '2026-11-14',
        '2026-11-01',
      ]);
    });

    await act(async () => {
      expect(await result.current.acciones.borrarLabor('id-3')).toBe(true);
    });
    await waitFor(() => {
      const vista = result.current.porLote.vista;
      expect(vista.estado === 'listo' && vista.datos).toHaveLength(1);
    });
  });

  it('actualizarLabor cambia el dato', async () => {
    const { result } = await montarConLote();
    await act(async () => {
      await result.current.acciones.crearLabor('id-1', datosLabor({ nota: 'zanja vieja' }));
    });
    await waitFor(() => expect(result.current.porLote.vista.estado).toBe('listo'));

    await act(async () => {
      await result.current.acciones.actualizarLabor('id-2', datosLabor({ nota: 'zanja nueva' }));
    });

    await waitFor(() => {
      const vista = result.current.porLote.vista;
      expect(vista.estado === 'listo' && vista.datos[0]?.nota).toBe('zanja nueva');
    });
  });

  it('la búsqueda encuentra labores y queda «vacía» si no hay coincidencias', async () => {
    const { result } = await montarConLote();
    await waitFor(() => expect(result.current.busqueda.vista).toEqual({ estado: 'vacio' }));

    await act(async () => {
      await result.current.acciones.crearLabor('id-1', datosLabor({ nota: 'Limpiar la zanja' }));
    });

    await waitFor(() => expect(result.current.busqueda.vista.estado).toBe('listo'));
  });

  it('un texto de búsqueda en blanco no devuelve resultados', async () => {
    const { result } = await montar(() => useBusqueda('   '));

    await waitFor(() => expect(result.current.vista).toEqual({ estado: 'vacio' }));
  });
});
