import { act } from '@testing-library/react-native';
import { crearLote } from '@/services/loteService';
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

describe('sincronización automática (D71)', () => {
  it('al abrir sincroniza una vez: sube lo pendiente y recuerda la fecha', async () => {
    espiarAppState();
    const { result, servidor } = await montar({
      sembrar: async (ctx) => {
        await crearLote(ctx, datosLote());
      },
    });

    await dejarCorrer();

    expect(servidor.lotes.size).toBe(1);
    expect(result.current.sync.resultado?.ok).toBe(true);
    expect(result.current.sync.ultimaVez).not.toBeNull();
    expect(result.current.sync.pendientes).toBe(0);
    expect(result.current.sync.sincronizando).toBe(false);
  });

  it('lo que baja del servidor se refleja (refresca las lecturas) y NO cuenta como cambio local', async () => {
    espiarAppState();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', { id: 'l1', ...datosLote() });
    const { result } = await montar({ cliente: servidor });

    await dejarCorrer();

    expect(result.current.cuaderno.version).toBeGreaterThan(0);
    expect(result.current.cuaderno.cambiosLocales).toBe(0);
    expect(result.current.sync.resultado).toEqual({
      ok: true,
      resumen: { enviados: 0, recibidos: 1, descartados: 0, conAviso: 0 },
    });
  });

  it('una sincronización no provoca otra (sin bucle)', async () => {
    espiarAppState();
    const servidor = crearServidorFalso();
    servidor.sembrar('lotes', { id: 'l1', ...datosLote() });
    await montar({ cliente: servidor });

    await dejarCorrer();
    const tras = obtenciones(servidor);
    await dejarCorrer(60_000);

    expect(obtenciones(servidor)).toBe(tras);
  });

  it('tras un cambio del usuario espera unos segundos y sincroniza; varios cambios seguidos, una sola vez', async () => {
    espiarAppState();
    const { result, servidor } = await montar({});
    await dejarCorrer();
    const antes = obtenciones(servidor);

    await act(async () => {
      await crearLote(result.current.cuaderno.ctx, datosLote({ nombre: 'A' }));
      result.current.cuaderno.invalidar();
    });
    await dejarCorrer(ESPERA - 1000);
    await act(async () => {
      await crearLote(result.current.cuaderno.ctx, datosLote({ nombre: 'B' }));
      result.current.cuaderno.invalidar();
    });
    await dejarCorrer(ESPERA - 1);
    expect(obtenciones(servidor)).toBe(antes);

    await dejarCorrer(1);

    expect(servidor.lotes.size).toBe(2);
    expect(obtenciones(servidor) - antes).toBe(3); // una vuelta = lotes + ciclos + labores
  });

  it('el contador de pendientes sube con un cambio del usuario y baja al sincronizar', async () => {
    espiarAppState();
    const { result } = await montar({});
    await dejarCorrer();

    await act(async () => {
      await crearLote(result.current.cuaderno.ctx, datosLote());
      result.current.cuaderno.invalidar();
    });
    expect(result.current.sync.pendientes).toBe(1);

    await dejarCorrer(ESPERA);
    expect(result.current.sync.pendientes).toBe(0);
  });

  it('al volver la app a primer plano sincroniza; pasar a segundo plano no', async () => {
    const estado = espiarAppState();
    const { servidor } = await montar({});
    await dejarCorrer();
    const antes = obtenciones(servidor);

    await act(async () => estado.cambiar('background'));
    await dejarCorrer();
    expect(obtenciones(servidor)).toBe(antes);

    await act(async () => estado.cambiar('active'));
    await dejarCorrer();
    expect(obtenciones(servidor)).toBeGreaterThan(antes);
  });

  it('al volver la conexión sincroniza; seguir conectado no repite', async () => {
    espiarAppState();
    const falsa = crearRedFalsa(true);
    const { result, servidor } = await montar({ red: falsa.red });
    await dejarCorrer();
    const antes = obtenciones(servidor);

    await act(async () => falsa.cambiar(false));
    expect(result.current.sync.enLinea).toBe(false);
    await act(async () => falsa.cambiar(true));
    await dejarCorrer();
    expect(result.current.sync.enLinea).toBe(true);
    expect(obtenciones(servidor)).toBeGreaterThan(antes);

    const despues = obtenciones(servidor);
    await act(async () => falsa.cambiar(true));
    await dejarCorrer();
    expect(obtenciones(servidor)).toBe(despues);
  });

  it('sin conexión no intenta sincronizar solo (ni al abrir ni tras un cambio), pero el botón sí lo intenta', async () => {
    espiarAppState();
    const { result, servidor } = await montar({ red: crearRedFalsa(false).red });
    await dejarCorrer();
    expect(servidor.llamadas).toHaveLength(0);
    expect(result.current.sync.enLinea).toBe(false);

    await act(async () => {
      await crearLote(result.current.cuaderno.ctx, datosLote());
      result.current.cuaderno.invalidar();
    });
    await dejarCorrer(ESPERA);
    expect(servidor.llamadas).toHaveLength(0);

    await act(async () => {
      await result.current.sync.sincronizarAhora();
    });
    expect(servidor.lotes.size).toBe(1);
  });
});
