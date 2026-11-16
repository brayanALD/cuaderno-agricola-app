import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { contarSync, leerEstadoSync, type ConteoSync } from '@/repositories/estadoSyncRepository';
import type { Contexto } from '@/services/contexto';
import type { MonitorRed } from '@/services/red';
import {
  CLAVE_ULTIMA_SYNC,
  sincronizar,
  type ClienteSync,
  type ResultadoSync,
} from '@/services/sincronizacionService';
import { crearEjecutorUnico } from '@/services/sync/ejecutorUnico';

const SIN_CONTEO: ConteoSync = { pendientes: 0, conAviso: 0 };
const ERROR_INESPERADO: ResultadoSync = {
  ok: false,
  motivo: 'servidor',
  mensaje: 'La sincronización falló por un error inesperado.',
};

/** Nada que recargar si la vuelta terminó bien y no movió nada. */
const cambioAlgo = (resultado: ResultadoSync): boolean =>
  !resultado.ok ||
  resultado.resumen.enviados + resultado.resumen.recibidos + resultado.resumen.conAviso > 0;

/**
 * Una vuelta de sincronización que nunca corre dos a la vez y que guarda cómo terminó. Un fallo del
 * programa se muestra como mensaje (no tumba la app). Si algo cambió, avisa para recargar las lecturas.
 */
export function useVueltaDeSync(ctx: Contexto, cliente: ClienteSync, refrescar: () => void) {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoSync | null>(null);
  const lanzar = useMemo(
    () =>
      crearEjecutorUnico(async () => {
        setSincronizando(true);
        try {
          const vuelta = await sincronizar(ctx, cliente);
          setResultado(vuelta);
          if (cambioAlgo(vuelta)) refrescar();
        } catch {
          setResultado(ERROR_INESPERADO);
        } finally {
          setSincronizando(false);
        }
      }),
    [ctx, cliente, refrescar],
  );
  return { sincronizando, resultado, lanzar };
}

/**
 * Contadores y fecha de la última vez: se releen tras cada escritura (del usuario o de la sincronización)
 * y TAMBIÉN al terminar cada vuelta (`vuelta`): una vuelta sin cambios no sube la versión de los datos,
 * pero sí guarda la hora (H2).
 */
export function useContadoresDeSync(ctx: Contexto, version: number, vuelta: ResultadoSync | null) {
  const [conteo, setConteo] = useState<ConteoSync>(SIN_CONTEO);
  const [ultimaVez, setUltimaVez] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    void Promise.all([contarSync(ctx.db), leerEstadoSync(ctx.db, CLAVE_ULTIMA_SYNC)]).then(
      ([cuenta, ultima]) => {
        if (!vigente) return;
        setConteo(cuenta);
        setUltimaVez(ultima);
      },
    );
    return () => {
      vigente = false;
    };
  }, [ctx, version, vuelta]);
  return { conteo, ultimaVez };
}

interface Disparadores {
  readonly red: MonitorRed;
  readonly lanzar: () => Promise<void>;
  readonly cambiosLocales: number;
  readonly esperaMs: number;
}

/**
 * Cuándo se sincroniza sola (D71): al abrir, al volver la conexión, al volver a la app y unos segundos
 * después de cada cambio del usuario. Sin conexión no lo intenta. Devuelve si hay internet.
 */
export function useDisparadoresDeSync({ red, lanzar, cambiosLocales, esperaMs }: Disparadores) {
  const [enLinea, setEnLinea] = useState(true);
  const enLineaAhora = useRef(true);

  // Al abrir: primero se mira si hay red; sin ella no se intenta sola.
  useEffect(() => {
    let vigente = true;
    const empezar = (conectado: boolean) => {
      if (!vigente) return;
      enLineaAhora.current = conectado;
      setEnLinea(conectado);
      if (conectado) void lanzar();
    };
    red.actual().then(empezar, () => empezar(true));
    return () => {
      vigente = false;
    };
  }, [red, lanzar]);

  // Al volver la conexión (no cada vez que se repite «conectado»).
  useEffect(
    () =>
      red.suscribir((conectado) => {
        const estaba = enLineaAhora.current;
        enLineaAhora.current = conectado;
        setEnLinea(conectado);
        if (conectado && !estaba) void lanzar();
      }),
    [red, lanzar],
  );

  // Al volver a la app desde segundo plano.
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && enLineaAhora.current) void lanzar();
    });
    return () => suscripcion.remove();
  }, [lanzar]);

  // Tras un cambio del usuario, con espera: cada cambio nuevo reinicia la cuenta.
  useEffect(() => {
    if (cambiosLocales === 0) return;
    const temporizador = setTimeout(() => {
      if (enLineaAhora.current) void lanzar();
    }, esperaMs);
    return () => clearTimeout(temporizador);
  }, [cambiosLocales, esperaMs, lanzar]);

  return enLinea;
}
