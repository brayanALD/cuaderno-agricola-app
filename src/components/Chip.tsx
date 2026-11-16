import { Pressable } from 'react-native';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';
import { unir } from './unir';

export interface ChipProps {
  readonly titulo: string;
  readonly activo: boolean;
  readonly onPress: () => void;
  readonly icono?: NombreIcono;
}

/**
 * Filtro en forma de chip: 48 dp de alto. Lo elegido se distingue por fondo suave, borde y una marca (✓), no solo
 * por color; TalkBack lo lee como «seleccionado» (D104).
 */
export function Chip({ titulo, activo, onPress, icono }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityState={{ selected: activo }}
      onPress={onPress}
      className={unir(
        'min-h-[48px] flex-row items-center gap-1.5 rounded-xl border-2 px-4 focus:border-focus',
        activo
          ? 'border-primary bg-primary-soft'
          : 'border-border bg-surface active:bg-surface-muted',
      )}
    >
      {activo ? <Icono nombre="checkmark" tamano={16} tono="primary" /> : null}
      {!activo && icono ? <Icono nombre={icono} tamano={16} tono="textMuted" /> : null}
      <Texto variante="etiqueta">{titulo}</Texto>
    </Pressable>
  );
}
