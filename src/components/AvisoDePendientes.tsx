import { View } from 'react-native';
import { usePendientes } from '@/hooks/usePendientes';
import { Icono } from './Icono';
import { Texto } from './Texto';

const textoCambios = (cantidad: number): string =>
  cantidad === 1 ? '1 cambio sin enviar' : `${String(cantidad)} cambios sin enviar`;

/**
 * Aviso global (D99): cuántos cambios faltan enviar al servidor y cuántos tienen aviso. Sin nada pendiente no
 * pinta nada; mientras carga o si falla la lectura tampoco (es informativo, no debe estorbar).
 */
export function AvisoDePendientes() {
  const { vista } = usePendientes();
  if (vista.estado !== 'listo') return null;
  const { pendientes, conAviso } = vista.datos;
  if (pendientes === 0 && conAviso === 0) return null;
  const avisos =
    conAviso === 0
      ? ''
      : conAviso === 1
        ? ' 1 tiene un aviso: ábrelo para corregirlo.'
        : ` ${String(conAviso)} tienen un aviso: ábrelos para corregirlos.`;
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2 rounded-xl bg-surface-muted p-3"
    >
      <Icono nombre="cloud-upload-outline" tono="primary" />
      <Texto className="flex-1">
        {textoCambios(pendientes)}. Se enviarán solos cuando haya conexión.{avisos}
      </Texto>
    </View>
  );
}
