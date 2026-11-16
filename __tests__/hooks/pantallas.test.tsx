import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useAcciones } from '@/hooks/useAcciones';
import { useAccionesLabor } from '@/hooks/useAccionesLabor';
import { useHoy } from '@/hooks/useHoy';
import { useLabor, useProximasLabores } from '@/hooks/useLabores';
import { crearContextoDePrueba, datosLabor, datosLote, HOY } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';

async function montar<T>(hook: () => T) {
  const ctx = await crearContextoDePrueba();
  const montado = await renderHook(hook, { wrapper: crearEnvoltorio(ctx) });
  return { ...montado, ctx };
}

describe('useHoy', () => {
  it('entrega el día de hoy del contexto', async () => {
    const { result } = await montar(() => useHoy());

    expect(result.current).toBe(HOY);
  });
});

describe('useLabor y useProximasLabores', () => {
  it('useLabor: «vacío» si no existe y los datos si existe', async () => {
    const { result } = await montar(() => ({
      inexistente: useLabor('nada'),
      existente: useLabor('id-2'),
      acciones: useAcciones(),
    }));
    await waitFor(() => expect(result.current.inexistente.vista).toEqual({ estado: 'vacio' }));

    await act(async () => {
      await result.current.acciones.crearLote(datosLote());
      await result.current.acciones.crearLabor('id-1', datosLabor({ nota: 'Goteo' }));
    });

    await waitFor(() => expect(result.current.existente.vista.estado).toBe('listo'));
    const vista = result.current.existente.vista;
    expect(vista.estado === 'listo' && vista.datos.nota).toBe('Goteo');
  });

  it('useProximasLabores: vacío sin lotes y una sugerencia por lote al crearlos', async () => {
    const { result } = await montar(() => ({
      proximas: useProximasLabores(),
      acciones: useAcciones(),
    }));
    await waitFor(() => expect(result.current.proximas.vista).toEqual({ estado: 'vacio' }));

    await act(async () => {
      await result.current.acciones.crearLote(datosLote());
    });

    await waitFor(() => expect(result.current.proximas.vista.estado).toBe('listo'));
    const vista = result.current.proximas.vista;
    expect(vista.estado === 'listo' && vista.datos[0]?.lote.nombre).toBe('El Mirador');
  });
});

describe('useAccionesLabor', () => {
  async function conLabor() {
    const montado = await montar(() => ({ ...useAccionesLabor(), acciones: useAcciones() }));
    await act(async () => {
      await montado.result.current.acciones.crearLote(datosLote());
      await montado.result.current.acciones.crearLabor('id-1', datosLabor({ fecha: '2026-11-01' }));
    });
    return montado;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('duplicar copia la labor con la fecha de hoy y deja un aviso', async () => {
    const { result, ctx } = await conLabor();
    expect(result.current.aviso).toBeNull();

    await act(async () => {
      await result.current.duplicar('id-2');
    });

    expect(result.current.aviso).toBe('Labor duplicada con la fecha de hoy.');
    const filas = await ctx.db.getAllAsync<{ fecha: string }>(
      'SELECT fecha FROM labor ORDER BY fecha',
    );
    expect(filas.map((f) => f.fecha)).toEqual(['2026-11-01', HOY]);
  });

  it('duplicar una labor que no existe avisa del problema', async () => {
    const { result } = await conLabor();

    await act(async () => {
      await result.current.duplicar('nada');
    });

    expect(result.current.aviso).toBe('No se pudo duplicar la labor.');
  });

  it('borrar pide confirmación y solo borra si se acepta', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result, ctx } = await conLabor();

    await act(async () => {
      result.current.borrar('id-2');
    });

    expect(alerta).toHaveBeenCalledTimes(1);
    const [titulo, , botones] = alerta.mock.calls[0] ?? [];
    expect(titulo).toBe('¿Borrar la labor?');
    expect(botones?.map((b) => b.text)).toEqual(['Cancelar', 'Borrar']);
    expect(await ctx.db.getAllAsync('SELECT id FROM labor WHERE deleted_at IS NULL')).toHaveLength(
      1,
    );

    await act(async () => {
      botones?.[1]?.onPress?.();
    });

    await waitFor(() => expect(result.current.aviso).toBe('Labor borrada.'));
    expect(await ctx.db.getAllAsync('SELECT id FROM labor WHERE deleted_at IS NULL')).toHaveLength(
      0,
    );
  });

  it('borrar y luego cancelar no cambia nada', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result, ctx } = await conLabor();
    await act(async () => {
      result.current.borrar('id-2');
    });
    const [, , botones] = alerta.mock.calls[0] ?? [];

    await act(async () => {
      botones?.[0]?.onPress?.();
    });

    expect(result.current.aviso).toBeNull();
    expect(await ctx.db.getAllAsync('SELECT id FROM labor WHERE deleted_at IS NULL')).toHaveLength(
      1,
    );
  });

  it('si el borrado falla (la labor ya no existe) lo avisa', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = await conLabor();
    await act(async () => {
      result.current.borrar('nada');
    });
    const [, , botones] = alerta.mock.calls[0] ?? [];

    await act(async () => {
      botones?.[1]?.onPress?.();
    });

    await waitFor(() => expect(result.current.aviso).toBe('No se pudo borrar la labor.'));
  });
});
