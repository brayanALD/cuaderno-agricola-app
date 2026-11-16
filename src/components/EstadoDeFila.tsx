import { View } from 'react-native';
import { Icono } from './Icono';
import { Texto } from './Texto';

export const TEXTO_PENDIENTE = 'Pendiente de enviar';

/**
 * Estado de sincronización de una fila, con icono Y texto (nunca solo color). Solo se dice lo que requiere
 * atención: «Pendiente de enviar». Lo normal (sincronizado) no se anuncia en cada fila, solo en Cuenta (D105).
 * Una fila con aviso tampoco lo muestra: ya tiene su `AvisoDeSync` con el motivo. El lector de pantalla lo recibe
 * dentro de la descripción de la fila, no como un elemento más.
 */
export function EstadoDeFila({
  pending,
  syncError,
}: {
  readonly pending: 0 | 1;
  readonly syncError: string | null;
}) {
  if (syncError !== null || pending === 0) return null;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="flex-row items-center gap-1 self-start"
    >
      <Icono nombre="cloud-upload-outline" tamano={16} tono="textMuted" />
      <Texto variante="ayuda">{TEXTO_PENDIENTE}</Texto>
    </View>
  );
}

/** La parte de la descripción accesible de una fila: solo dice algo si falta enviarla (y no tiene aviso). */
export const descripcionDeEstado = (pending: 0 | 1, syncError: string | null): string =>
  pending === 1 && syncError === null ? `. ${TEXTO_PENDIENTE}` : '';
