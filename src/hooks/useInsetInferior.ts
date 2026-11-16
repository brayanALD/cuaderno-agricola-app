import { useContext } from 'react';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

/**
 * Margen mínimo inferior (dp). Con navegación por gestos (p. ej. Samsung A35) Android da a la app 0 de
 * zona segura abajo pero reserva ~31 dp para el gesto «ir al inicio» (`mandatorySystemGestures`): lo que
 * quede ahí queda pegado al borde y tocarlo puede activar el gesto (D87).
 */
export const MARGEN_MINIMO_INFERIOR = 16;

/** El inset inferior real o, si es menor, el mínimo. Función pura, con prueba. */
export const insetInferior = (real: number): number => Math.max(real, MARGEN_MINIMO_INFERIOR);

export function useInsetInferior(): number {
  // El contexto admite `null` (sin proveedor, p. ej. en pruebas): cuenta como 0 de zona segura real.
  const insets = useContext(SafeAreaInsetsContext);
  return insetInferior(insets?.bottom ?? 0);
}
