import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useColores } from '@/theme/EsquemaProvider';
import { unir } from './unir';

/** Un solo valor animado para todo el grupo: 15 bloques no son 15 animaciones (el Redmi A2 es el más lento). */
const PulsoContext = createContext<SharedValue<number> | null>(null);

/** Cuánto se aclara (o oscurece) un bloque en lo alto del pulso: se nota sin parpadear. */
const INTENSIDAD = 0.55;
const DURACION_MS = 900;

/**
 * Agrupa los bloques de un esqueleto. Para el lector de pantalla es UN elemento («Cargando», anunciado una sola
 * vez) y los bloques no se leen. Con «reducir movimiento» los bloques quedan quietos.
 */
export function GrupoEsqueleto({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const reducido = useReducedMotion();
  const pulso = useSharedValue(0);
  useEffect(() => {
    if (!reducido) pulso.set(withRepeat(withTiming(1, { duration: DURACION_MS }), -1, true));
    return () => cancelAnimation(pulso);
  }, [pulso, reducido]);
  return (
    <PulsoContext.Provider value={pulso}>
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando"
        accessibilityLiveRegion="polite"
        className={unir('gap-3', className)}
      >
        {children}
      </View>
    </PulsoContext.Provider>
  );
}

/** Bloque con la forma de lo que viene. El tamaño lo da `className` (`h-5 w-40`…). */
export function Esqueleto({ className }: { readonly className?: string }) {
  const pulso = useContext(PulsoContext);
  const colores = useColores();
  const estilo = useAnimatedStyle(() => ({
    opacity: pulso === null ? 0 : pulso.get() * INTENSIDAD,
  }));
  return (
    <View className={unir('overflow-hidden rounded-lg bg-surface-muted', className)}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colores.surface }, estilo]}
      />
    </View>
  );
}
