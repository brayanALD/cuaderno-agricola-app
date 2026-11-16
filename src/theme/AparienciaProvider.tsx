import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  aplicarApariencia,
  leerApariencia,
  type AlmacenDeApariencia,
  type Apariencia,
} from './apariencia';

export interface AparienciaValor {
  readonly apariencia: Apariencia;
  readonly cambiar: (apariencia: Apariencia) => void;
}

/** Sin proveedor (pruebas de pantallas sueltas) la app sigue al sistema y cambiar no hace nada. */
const AparienciaContext = createContext<AparienciaValor>({
  apariencia: 'sistema',
  cambiar: () => undefined,
});

/**
 * Lee la apariencia elegida y la aplica ANTES de pintar nada (no hay parpadeo del tema equivocado). Va en la
 * raíz, sobre `EsquemaProvider`. Cambiarla la aplica al instante y la guarda en el teléfono.
 */
export function AparienciaProvider({
  almacen,
  children,
}: {
  /** Referencia estable (no crearla en cada render). */
  readonly almacen: AlmacenDeApariencia;
  readonly children: ReactNode;
}) {
  const [apariencia, setApariencia] = useState<Apariencia>('sistema');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let vigente = true;
    void leerApariencia(almacen).then((leida) => {
      if (!vigente) return;
      aplicarApariencia(leida);
      setApariencia(leida);
      setListo(true);
    });
    return () => {
      vigente = false;
    };
  }, [almacen]);

  const cambiar = useCallback(
    (nueva: Apariencia) => {
      aplicarApariencia(nueva);
      setApariencia(nueva);
      almacen.guardar(nueva).catch(() => undefined);
    },
    [almacen],
  );
  const valor = useMemo(() => ({ apariencia, cambiar }), [apariencia, cambiar]);

  if (!listo) return null;
  return <AparienciaContext.Provider value={valor}>{children}</AparienciaContext.Provider>;
}

export function useApariencia(): AparienciaValor {
  return useContext(AparienciaContext);
}
