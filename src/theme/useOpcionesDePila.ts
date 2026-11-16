import { useColores } from './EsquemaProvider';

/** Encabezado y fondo de las pilas de navegación con los tokens de la paleta (claro y oscuro). */
export function useOpcionesDePila() {
  const colores = useColores();
  return {
    headerStyle: { backgroundColor: colores.surface },
    headerTintColor: colores.text,
    contentStyle: { backgroundColor: colores.background },
  };
}
