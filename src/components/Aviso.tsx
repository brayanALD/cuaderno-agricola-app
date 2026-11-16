import { View } from 'react-native';
import { Icono } from './Icono';
import { Texto } from './Texto';

/** Resultado de una acción («Labor duplicada…»): visible y anunciado por el lector de pantalla. */
export function Aviso({ texto }: { readonly texto: string | null }) {
  if (texto === null) return null;
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2 rounded-xl bg-surface-muted p-3"
    >
      <Icono nombre="checkmark-circle" tono="primary" />
      <Texto className="flex-1">{texto}</Texto>
    </View>
  );
}
