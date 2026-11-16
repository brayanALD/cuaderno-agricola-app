import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';
import type { ReactNode } from 'react';
import { CuadernoProvider, useCuaderno } from '@/context/CuadernoContext';
import { SincronizacionProvider, useSincronizacion } from '@/context/SincronizacionContext';
import type { MonitorRed } from '@/services/red';
import type { ClienteSync } from '@/services/sincronizacionService';
import { crearDispositivo } from './dispositivo';
import { crearServidorFalso } from './servidorFalso';

export const ESPERA = 3000;

/** Una red que se controla a mano: estado actual y aviso de cambios. */
export function crearRedFalsa(conectada = true) {
  let oyente: ((conectado: boolean) => void) | null = null;
  const baja = jest.fn();
  const red: MonitorRed = {
    actual: () => Promise.resolve(conectada),
    suscribir: (nuevo) => {
      oyente = nuevo;
      return baja;
    },
  };
  return {
    red,
    baja,
    cambiar: (conectado: boolean) => {
      conectada = conectado;
      oyente?.(conectado);
    },
  };
}

/** Captura el aviso de «la app volvió a primer plano» que pide el proveedor. */
export function espiarAppState() {
  let manejador: ((estado: AppStateStatus) => void) | null = null;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_tipo, nuevo) => {
    manejador = nuevo;
    return { remove };
  });
  return { cambiar: (estado: AppStateStatus) => manejador?.(estado), remove };
}

export async function montar(opciones: {
  cliente?: ClienteSync;
  red?: MonitorRed;
  sembrar?: (ctx: Awaited<ReturnType<typeof crearDispositivo>>['ctx']) => Promise<void>;
}) {
  const { ctx, avanzar } = await crearDispositivo();
  await opciones.sembrar?.(ctx);
  const servidor = crearServidorFalso();
  const cliente = opciones.cliente ?? servidor;
  const red = opciones.red ?? crearRedFalsa().red;
  const abrir = () => Promise.resolve(ctx);
  const Envoltorio = ({ children }: { children: ReactNode }) => (
    <CuadernoProvider abrir={abrir} cargando={null} alError={() => null}>
      <SincronizacionProvider cliente={cliente} red={red} esperaMs={ESPERA}>
        {children}
      </SincronizacionProvider>
    </CuadernoProvider>
  );
  const resultado = await renderHook(
    () => ({ sync: useSincronizacion(), cuaderno: useCuaderno() }),
    { wrapper: Envoltorio },
  );
  return { ...resultado, ctx, servidor, avanzar };
}

export const obtenciones = (servidor: ReturnType<typeof crearServidorFalso>) =>
  servidor.llamadasA('GET').length;

export async function dejarCorrer(ms = 0) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}
