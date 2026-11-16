import { View } from 'react-native';
import type { TokenColor } from '@/theme/tokens';
import { Icono, type NombreIcono } from './Icono';
import { Texto, type TonoTexto } from './Texto';
import { unir } from './unir';

/**
 * Un color, un significado (D104): dorado = toca hoy; rojo = vencida; neutro = información; marca = etiqueta
 * de lo que es (el cultivo). El texto nunca usa el color de marca sobre un fondo suave (contraste).
 */
const TONOS: Record<
  'dorado' | 'neutro' | 'peligro' | 'marca',
  { caja: string; texto: TonoTexto; icono: TokenColor }
> = {
  dorado: { caja: 'bg-accent', texto: 'sobreAcento', icono: 'onAccent' },
  neutro: { caja: 'bg-surface-muted', texto: 'tenue', icono: 'textMuted' },
  peligro: { caja: 'bg-danger-soft', texto: 'peligro', icono: 'danger' },
  marca: { caja: 'bg-primary-soft', texto: 'texto', icono: 'primary' },
};

export type TonoInsignia = keyof typeof TONOS;

export interface InsigniaProps {
  readonly children: string;
  readonly tono?: TonoInsignia;
  /** Icono opcional: refuerza el significado para quien no distingue colores. */
  readonly icono?: NombreIcono;
}

/** Etiqueta corta de estado. Por defecto es dorada (la de siempre); no es táctil. */
export function Insignia({ children, tono = 'dorado', icono }: InsigniaProps) {
  const estilo = TONOS[tono];
  return (
    <View
      className={unir('flex-row items-center gap-1 self-start rounded-full px-3 py-1', estilo.caja)}
    >
      {icono ? <Icono nombre={icono} tamano={16} tono={estilo.icono} /> : null}
      <Texto variante="etiqueta" tono={estilo.texto}>
        {children}
      </Texto>
    </View>
  );
}
