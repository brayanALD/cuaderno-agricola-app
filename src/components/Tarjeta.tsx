import type { ReactNode } from 'react';
import { View } from 'react-native';
import { unir } from './unir';

/** Contenedor con superficie, borde y relleno de tokens. El contenido va como `children`. */
export function Tarjeta({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <View className={unir('gap-2 rounded-2xl border border-border bg-surface p-4', className)}>
      {children}
    </View>
  );
}
