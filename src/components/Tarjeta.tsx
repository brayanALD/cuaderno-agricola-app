import type { ReactNode } from 'react';
import { View } from 'react-native';
import { unir } from './unir';

/** El borde de una tarjeta es decorativo (`divider`); `border` queda para los controles (D104). */
const TONOS = {
  normal: 'border-divider bg-surface',
  aviso: 'border-divider bg-accent-soft',
  peligro: 'border-danger bg-danger-soft',
} as const;

export type TonoTarjeta = keyof typeof TONOS;

/** Contenedor con superficie, borde y relleno de tokens. El contenido va como `children`. */
export function Tarjeta({
  children,
  className,
  tono = 'normal',
  accessibilityLiveRegion,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  /** `aviso` (dorado suave) pide atención sin bloquear; `peligro` (rojo suave) marca lo vencido. */
  readonly tono?: TonoTarjeta;
  /** Para un aviso que se anuncia al aparecer. */
  readonly accessibilityLiveRegion?: 'polite' | 'assertive';
}) {
  return (
    <View
      accessibilityLiveRegion={accessibilityLiveRegion}
      className={unir('gap-2 rounded-2xl border p-4', TONOS[tono], className)}
    >
      {children}
    </View>
  );
}
