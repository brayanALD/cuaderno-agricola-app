import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Contexto } from '@/services/contexto';
import { aError } from './aError';

export interface CuadernoValor {
  readonly ctx: Contexto;
  /** Sube tras cada escritura correcta (D: contador de versión); los hooks de lectura recargan al verlo cambiar. */
  readonly version: number;
  /** Cuántas escrituras ha hecho el USUARIO (no la sincronización): lo que dispara una sincronización (D71). */
  readonly cambiosLocales: number;
  /** Escritura del usuario: recarga las lecturas y cuenta como cambio local. */
  readonly invalidar: () => void;
  /** Escritura de la sincronización: recarga las lecturas pero NO cuenta como cambio local (evita el bucle). */
  readonly refrescar: () => void;
}

type Estado =
  | { readonly tipo: 'cargando' }
  | { readonly tipo: 'error'; readonly error: Error }
  | { readonly tipo: 'listo'; readonly ctx: Contexto };

export interface CuadernoProviderProps {
  /** Abre la base y arma el contexto. Debe ser una referencia estable (no crearla en cada render). */
  readonly abrir: () => Promise<Contexto>;
  readonly cargando: ReactNode;
  readonly alError: (reintentar: () => void, error: Error) => ReactNode;
  readonly children: ReactNode;
}

const CuadernoContext = createContext<CuadernoValor | null>(null);

/** Abre la base, muestra carga o error con reintento y, cuando está lista, provee el contexto. */
export function CuadernoProvider({ abrir, cargando, alError, children }: CuadernoProviderProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [version, setVersion] = useState(0);
  const [cambiosLocales, setCambiosLocales] = useState(0);
  const refrescar = useCallback(() => setVersion((anterior) => anterior + 1), []);
  const invalidar = useCallback(() => {
    setVersion((anterior) => anterior + 1);
    setCambiosLocales((anterior) => anterior + 1);
  }, []);
  const reintentar = useCallback(() => {
    setEstado({ tipo: 'cargando' });
    setIntento((anterior) => anterior + 1);
  }, []);

  useEffect(() => {
    let vigente = true;
    abrir().then(
      (ctx) => {
        if (vigente) setEstado({ tipo: 'listo', ctx });
      },
      (error: unknown) => {
        if (vigente) setEstado({ tipo: 'error', error: aError(error) });
      },
    );
    return () => {
      vigente = false;
    };
  }, [abrir, intento]);

  const valor = useMemo<CuadernoValor | null>(
    () =>
      estado.tipo === 'listo'
        ? { ctx: estado.ctx, version, cambiosLocales, invalidar, refrescar }
        : null,
    [estado, version, cambiosLocales, invalidar, refrescar],
  );

  if (estado.tipo === 'error') return <>{alError(reintentar, estado.error)}</>;
  if (valor === null) return <>{cargando}</>;
  return <CuadernoContext.Provider value={valor}>{children}</CuadernoContext.Provider>;
}

export function useCuaderno(): CuadernoValor {
  const valor = useContext(CuadernoContext);
  if (valor === null) throw new Error('useCuaderno debe usarse dentro de <CuadernoProvider>.');
  return valor;
}
