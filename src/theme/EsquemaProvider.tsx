import { VariableContextProvider } from 'nativewind';
import { useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { coloresDeTema, variablesDeTema, type ColoresDeTema, type Esquema } from './tokens';

/** Esquema del sistema; si no declara ninguno, el claro. */
export function useEsquema(): Esquema {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

/** Colores crudos del esquema actual, para props que no aceptan clases (p. ej. `color` de un icono). */
export function useColores(): ColoresDeTema {
  return coloresDeTema(useEsquema());
}

/**
 * Cambia el valor de las variables `--color-*` según el esquema del sistema (D46). Las clases
 * (`bg-background`, `text-text`…) no cambian: lo que cambia es el valor de su variable.
 */
export function EsquemaProvider({ children }: { readonly children: ReactNode }) {
  const esquema = useEsquema();
  const variables = useMemo(() => variablesDeTema(esquema), [esquema]);
  return <VariableContextProvider value={variables}>{children}</VariableContextProvider>;
}
