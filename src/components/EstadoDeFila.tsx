import { View } from 'react-native';
import { Icono } from './Icono';
import { Texto } from './Texto';

export const TEXTO_PENDIENTE = 'Pendiente de enviar';
export const TEXTO_SINCRONIZADO = 'Sincronizado';

/**
 * Estado de sincronización de una fila (D99), con icono Y texto (nunca solo color). Una fila con aviso no lo
 * muestra: ya tiene su `AvisoDeSync` con el motivo. El lector de pantalla lo recibe dentro de la descripción de
 * la fila (solo cuando está pendiente), no como un elemento más.
 */
export function EstadoDeFila({
  pending,
  syncError,
}: {
  readonly pending: 0 | 1;
  readonly syncError: string | null;
}) {
  if (syncError !== null) return null;
  const pendiente = pending === 1;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="flex-row items-center gap-1 self-start"
    >
      <Icono
        nombre={pendiente ? 'cloud-upload-outline' : 'cloud-done-outline'}
        tamano={16}
        tono="textMuted"
      />
      <Texto variante="ayuda">{pendiente ? TEXTO_PENDIENTE : TEXTO_SINCRONIZADO}</Texto>
    </View>
  );
}

/** La parte de la descripción accesible de una fila: solo dice algo si falta enviarla (y no tiene aviso). */
export const descripcionDeEstado = (pending: 0 | 1, syncError: string | null): string =>
  pending === 1 && syncError === null ? `. ${TEXTO_PENDIENTE}` : '';
