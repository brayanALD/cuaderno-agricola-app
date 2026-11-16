import { View } from 'react-native';
import { Icono } from './Icono';
import { Texto } from './Texto';

/** Advertencia de periodo de carencia (D95): icono + texto (no depende solo del color) y se anuncia al aparecer. */
export function AvisoDeCarencia({ texto }: { readonly texto: string }) {
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="flex-row items-start gap-2 rounded-xl bg-surface-muted p-3"
    >
      <Icono nombre="warning-outline" tono="danger" />
      <Texto className="flex-1">{texto}</Texto>
    </View>
  );
}
