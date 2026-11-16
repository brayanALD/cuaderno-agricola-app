import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UsuarioSesion } from '@/api/almacenSesion';
import type { Resultado } from '@/services/resultado';
import type { DatosAcceso, SesionService } from '@/services/sesionService';

export interface SesionValor {
  /** `null` = sin sesión (hay que ir al login). */
  readonly usuario: UsuarioSesion | null;
  readonly iniciarSesion: (datos: DatosAcceso) => Promise<Resultado<UsuarioSesion>>;
  readonly registrar: (datos: DatosAcceso) => Promise<Resultado<UsuarioSesion>>;
  readonly recuperarPassword: (datos: { readonly email: string }) => Promise<Resultado<null>>;
  readonly cerrarSesion: () => Promise<void>;
}

type Estado =
  | { readonly tipo: 'cargando' }
  | { readonly tipo: 'lista'; readonly usuario: UsuarioSesion | null };

export interface SesionProviderProps {
  /** Debe ser una referencia estable (no crearla en cada render). */
  readonly servicio: SesionService;
  readonly cargando: ReactNode;
  readonly children: ReactNode;
}

const SesionContext = createContext<SesionValor | null>(null);

/**
 * Quién tiene la sesión abierta. Al arrancar la restaura SIN red (D60) y mientras tanto muestra
 * `cargando`; si la API rechaza la renovación del token, vuelve a «sin sesión».
 */
export function SesionProvider({ servicio, cargando, children }: SesionProviderProps) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    let vigente = true;
    const terminar = (usuario: UsuarioSesion | null) => {
      if (vigente) setEstado({ tipo: 'lista', usuario });
    };
    servicio.restaurar().then(terminar, () => terminar(null));
    const darDeBaja = servicio.alExpirar(() => terminar(null));
    return () => {
      vigente = false;
      darDeBaja();
    };
  }, [servicio]);

  const entrar = useCallback(async (resultado: Promise<Resultado<UsuarioSesion>>) => {
    const hecho = await resultado;
    if (hecho.ok) setEstado({ tipo: 'lista', usuario: hecho.valor });
    return hecho;
  }, []);

  const valor = useMemo<SesionValor | null>(
    () =>
      estado.tipo === 'cargando'
        ? null
        : {
            usuario: estado.usuario,
            iniciarSesion: (datos) => entrar(servicio.iniciarSesion(datos)),
            registrar: (datos) => entrar(servicio.registrar(datos)),
            recuperarPassword: (datos) => servicio.recuperarPassword(datos),
            cerrarSesion: async () => {
              await servicio.cerrarSesion();
              setEstado({ tipo: 'lista', usuario: null });
            },
          },
    [estado, servicio, entrar],
  );

  if (valor === null) return <>{cargando}</>;
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion(): SesionValor {
  const valor = useContext(SesionContext);
  if (valor === null) throw new Error('useSesion debe usarse dentro de <SesionProvider>.');
  return valor;
}
