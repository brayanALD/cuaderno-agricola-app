import { Pressable } from 'react-native';
import type { TokenColor } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { unir } from './unir';

interface BotonIconoProps {
  readonly icono: NombreIcono;
  /** Obligatoria: un control sin texto solo existe para el lector de pantalla por esta etiqueta. */
  readonly etiqueta: string;
  readonly onPress: () => void;
  readonly deshabilitado?: boolean;
  readonly tono?: TokenColor;
  readonly className?: string;
}

/** Control solo de icono, de 48 × 48 dp. */
export function BotonIcono({
  icono,
  etiqueta,
  onPress,
  deshabilitado = false,
  tono = 'text',
  className,
}: BotonIconoProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={onPress}
      className={unir(
        'min-h-[48px] min-w-[48px] items-center justify-center rounded-full border-2 border-transparent active:bg-surface-muted focus:border-focus',
        deshabilitado && 'opacity-50',
        className,
      )}
    >
      <Icono nombre={icono} tono={tono} />
    </Pressable>
  );
}
