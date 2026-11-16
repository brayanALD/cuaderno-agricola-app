import { ActivityIndicator, Pressable } from 'react-native';
import { useColores } from '@/theme/EsquemaProvider';
import type { TokenColor } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto, type TonoTexto } from './Texto';
import { unir } from './unir';

export type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'texto';

/** 48 dp de alto mínimo (WCAG 2.5.8 y Material) y un borde que se pinta con el foco (WCAG 2.4.7). */
const BASE =
  'min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 focus:border-focus';

const FONDO: Record<VarianteBoton, string> = {
  primario: 'bg-primary border-transparent active:bg-primary-pressed',
  secundario: 'bg-surface border-primary active:bg-surface-muted',
  peligro: 'bg-danger border-transparent active:opacity-80',
  texto: 'bg-transparent border-transparent active:bg-surface-muted',
};

const TONO: Record<VarianteBoton, TonoTexto> = {
  primario: 'sobrePrimario',
  secundario: 'primario',
  peligro: 'sobrePeligro',
  texto: 'primario',
};

const COLOR_PROGRESO: Record<VarianteBoton, TokenColor> = {
  primario: 'onPrimary',
  secundario: 'primary',
  peligro: 'onDanger',
  texto: 'primary',
};

export interface BotonProps {
  readonly titulo: string;
  readonly onPress: () => void;
  readonly variante?: VarianteBoton;
  readonly cargando?: boolean;
  readonly deshabilitado?: boolean;
  /** Si el texto visible no basta para el lector de pantalla (p. ej. «+»). */
  readonly etiqueta?: string;
  readonly icono?: NombreIcono;
  readonly className?: string;
}

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  cargando = false,
  deshabilitado = false,
  etiqueta,
  icono,
  className,
}: BotonProps) {
  const colores = useColores();
  const inactivo = deshabilitado || cargando;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      disabled={inactivo}
      onPress={onPress}
      className={unir(BASE, FONDO[variante], deshabilitado && 'opacity-50', className)}
    >
      {cargando ? (
        <ActivityIndicator testID="indicador-de-carga" color={colores[COLOR_PROGRESO[variante]]} />
      ) : null}
      {icono && !cargando ? <Icono nombre={icono} tono={COLOR_PROGRESO[variante]} /> : null}
      <Texto variante="boton" tono={TONO[variante]}>
        {titulo}
      </Texto>
    </Pressable>
  );
}
