import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { MonitorRed } from '@/services/red';
import type { ClienteSync, ResultadoSync } from '@/services/sincronizacionService';
import { useCuaderno } from './CuadernoContext';
import { useContadoresDeSync, useDisparadoresDeSync, useVueltaDeSync } from './sincronizacionHooks';

export interface SincronizacionValor {
  readonly sincronizando: boolean;
  /** Cómo terminó la última vuelta (`null` = todavía ninguna). */
  readonly resultado: ResultadoSync | null;
  /** Cuándo terminó bien la última sincronización (ISO). */
  readonly ultimaVez: string | null;
  /** Cambios que faltan enviar. */
  readonly pendientes: number;
  /** Lotes y labores que el servidor rechazó y esperan que el usuario los arregle (D73). */
  readonly conAviso: number;
  readonly enLinea: boolean;
  /** El botón «Sincronizar ahora»: lo intenta aunque la red diga que no hay conexión. */
  readonly sincronizarAhora: () => Promise<void>;
}

export interface SincronizacionProviderProps {
  /** Referencia estable (no crearla en cada render). */
  readonly cliente: ClienteSync;
  readonly red: MonitorRed;
  /** Espera tras un cambio del usuario antes de sincronizar: así varios cambios seguidos son una sola vuelta. */
  readonly esperaMs?: number;
  readonly children: ReactNode;
}

const ESPERA_POR_DEFECTO_MS = 3000;

const SincronizacionContext = createContext<SincronizacionValor | null>(null);

/**
 * Orquesta la sincronización (D71): sola al abrir, al volver a la app, al volver la red y unos segundos
 * después de cada cambio del usuario; y a mano con «Sincronizar ahora». Nunca corre dos a la vez. Sin
 * conexión no lo intenta sola. Va DENTRO de `CuadernoProvider` (necesita la base del usuario).
 */
export function SincronizacionProvider({
  cliente,
  red,
  esperaMs = ESPERA_POR_DEFECTO_MS,
  children,
}: SincronizacionProviderProps) {
  const { ctx, version, cambiosLocales, refrescar } = useCuaderno();
  const { sincronizando, resultado, lanzar } = useVueltaDeSync(ctx, cliente, refrescar);
  const { conteo, ultimaVez } = useContadoresDeSync(ctx, version, resultado);
  const enLinea = useDisparadoresDeSync({ red, lanzar, cambiosLocales, esperaMs });

  const valor = useMemo<SincronizacionValor>(
    () => ({
      sincronizando,
      resultado,
      ultimaVez,
      pendientes: conteo.pendientes,
      conAviso: conteo.conAviso,
      enLinea,
      sincronizarAhora: lanzar,
    }),
    [sincronizando, resultado, ultimaVez, conteo, enLinea, lanzar],
  );
  return <SincronizacionContext.Provider value={valor}>{children}</SincronizacionContext.Provider>;
}

export function useSincronizacion(): SincronizacionValor {
  const valor = useContext(SincronizacionContext);
  if (valor === null) {
    throw new Error('useSincronizacion debe usarse dentro de <SincronizacionProvider>.');
  }
  return valor;
}
