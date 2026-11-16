import { View } from 'react-native';
import { Icono } from './Icono';
import { Texto } from './Texto';

/**
 * Error de un campo: icono + texto (no depende solo del color, WCAG 1.4.1) y región viva
 * para que TalkBack lo anuncie cuando aparece.
 */
export function MensajeError({ texto }: { readonly texto?: string }) {
  if (texto === undefined || texto === '') return null;
  return (
    <View accessible accessibilityRole="alert" className="flex-row items-center gap-1">
      <Icono nombre="alert-circle" tamano={18} tono="danger" />
      <Texto variante="error" accessibilityLiveRegion="polite" className="flex-1">
        {texto}
      </Texto>
    </View>
  );
}
