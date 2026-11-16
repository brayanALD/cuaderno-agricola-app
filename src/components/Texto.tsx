import { Text, type TextProps } from 'react-native';
import { unir } from './unir';

/** Tamaño y peso. El color va aparte (`tono`) para que dos clases de color nunca compitan. */
const VARIANTES = {
  titulo: 'text-2xl font-bold',
  subtitulo: 'text-lg font-semibold',
  cuerpo: 'text-base',
  etiqueta: 'text-sm font-semibold',
  ayuda: 'text-sm',
  error: 'text-sm font-medium',
  boton: 'text-base font-semibold',
  enlace: 'text-base font-medium underline',
} as const;

const TONOS = {
  texto: 'text-text',
  tenue: 'text-text-muted',
  primario: 'text-primary',
  peligro: 'text-danger',
  sobrePrimario: 'text-on-primary',
  sobrePeligro: 'text-on-danger',
  sobreAcento: 'text-on-accent',
} as const;

export type VarianteTexto = keyof typeof VARIANTES;
export type TonoTexto = keyof typeof TONOS;

const TONO_POR_VARIANTE: Partial<Record<VarianteTexto, TonoTexto>> = {
  ayuda: 'tenue',
  error: 'peligro',
  enlace: 'primario',
};

export interface TextoProps extends TextProps {
  readonly variante?: VarianteTexto;
  readonly tono?: TonoTexto;
  readonly className?: string;
}

/** Único componente de texto de la app: el tamaño escala con el ajuste de texto del sistema. */
export function Texto({ variante = 'cuerpo', tono, className, ...resto }: TextoProps) {
  const color = TONOS[tono ?? TONO_POR_VARIANTE[variante] ?? 'texto'];
  return (
    <Text
      accessibilityRole={variante === 'titulo' ? 'header' : resto.accessibilityRole}
      className={unir(VARIANTES[variante], color, className)}
      {...resto}
    />
  );
}
