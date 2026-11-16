import { act, renderHook } from '@testing-library/react-native';
import { useSincronizacion } from '@/context/SincronizacionContext';
import { crearLote } from '@/services/loteService';
import type { ClienteSync } from '@/services/sincronizacionService';
import { datosLote } from '../helpers/contexto';
import {
  crearRedFalsa,
  dejarCorrer,
  ESPERA,
  espiarAppState,
  montar,
  obtenciones,
} from '../helpers/montarSincronizacion';
import { crearServidorFalso } from '../helpers/servidorFalso';

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('sincronización manual y fallos', () => {
  it('sincronizarAhora guarda el resultado y el mensaje cuando no hay conexión', async () => {
    espiarAppState();
    const servidor = crearServidorFalso();
    const { result } = await montar({ cliente: servidor });
    await dejarCorrer();
    servidor.estado.sinRed = true;

    await act(async () => {
      await result.current.sync.sincronizarAhora();
    });

    expect(result.current.sync.resultado).toEqual({
      ok: false,
      motivo: 'sin-conexion',
      mensaje: 'Sin conexión: tus cambios se enviarán cuando vuelva.',
    });
  });

  it('«Última sincronización» se actualiza aunque la vuelta no haya movido nada (H2)', async () => {
    espiarAppState();
    const { result, avanzar } = await montar({});
    await dejarCorrer();
    const primera = result.current.sync.ultimaVez;
    expect(primera).not.toBeNull();

    avanzar(120_000);
    await act(async () => {
      await result.current.sync.sincronizarAhora();
    });

    expect(result.current.sync.ultimaVez).not.toBeNull();
    expect(result.current.sync.ultimaVez).not.toBe(primera);
    expect(Date.parse(result.current.sync.ultimaVez ?? '')).toBe(
      Date.parse(primera ?? '') + 120_000,
    );
  });

  it('un fallo inesperado del programa se muestra como mensaje, no tumba la app', async () => {
    espiarAppState();
    const roto: ClienteSync = { pedir: () => Promise.reject(new TypeError('x is not a function')) };
    const { result } = await montar({
      cliente: roto,
      sembrar: async (ctx) => {
        await crearLote(ctx, datosLote());
      },
    });

    await dejarCorrer();

    expect(result.current.sync.resultado).toEqual({
      ok: false,
      motivo: 'servidor',
      mensaje: 'La sincronización falló por un error inesperado.',
    });
    expect(result.current.sync.sincronizando).toBe(false);
  });

  it('muestra los lotes con aviso (D73) en el contador', async () => {
    espiarAppState();
    const servidor = crearServidorFalso();
    servidor.guardar('lotes', 'otro-telefono', datosLote());
    const { result } = await montar({
      cliente: servidor,
      sembrar: async (ctx) => {
        await crearLote(ctx, datosLote({ nombre: 'EL MIRADOR' }));
      },
    });

    await dejarCorrer();

    expect(result.current.sync.conAviso).toBe(1);
    expect(result.current.sync.pendientes).toBe(1);
  });

  it('al desmontar se da de baja de la app y de la red, y no sincroniza más', async () => {
    const estado = espiarAppState();
    const falsa = crearRedFalsa(true);
    const { result, servidor, unmount } = await montar({ red: falsa.red });
    await dejarCorrer();
    await act(async () => {
      await crearLote(result.current.cuaderno.ctx, datosLote());
      result.current.cuaderno.invalidar();
    });
    const antes = obtenciones(servidor);

    await unmount();
    await dejarCorrer(ESPERA * 2);

    expect(estado.remove).toHaveBeenCalled();
    expect(falsa.baja).toHaveBeenCalled();
    expect(obtenciones(servidor)).toBe(antes);
  });
});

describe('useSincronizacion', () => {
  it('sin proveedor avisa del error de programación', async () => {
    const consola = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(renderHook(() => useSincronizacion())).rejects.toThrow(
      'useSincronizacion debe usarse dentro de <SincronizacionProvider>.',
    );
    consola.mockRestore();
  });
});
