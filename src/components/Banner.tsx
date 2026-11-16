import { View } from 'react-native';
import type { TokenColor } from '@/theme/tokens';
import { Boton } from './Boton';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';
import { unir } from './unir';

/**
 * Información = verde suave; aviso = dorado suave (no bloquea); error = rojo suave. El disco de color lleva un
 * icono propio: el significado nunca depende solo del color (D104).
 */
const ESTILO: Record<
  'info' | 'aviso' | 'error',
  { caja: string; disco: string; icono: TokenColor }
> = {
  info: { caja: 'bg-primary-soft', disco: 'bg-primary', icono: 'onPrimary' },
  aviso: { caja: 'bg-accent-soft', disco: 'bg-accent', icono: 'onAccent' },
  error: { caja: 'bg-danger-soft', disco: 'bg-danger', icono: 'onDanger' },
};

export type TonoBanner = keyof typeof ESTILO;

export interface BannerProps {
  readonly tono?: TonoBanner;
  readonly icono: NombreIcono;
  readonly titulo?: string;
  readonly texto: string;
  /** Acción corta (p. ej. «Ver»): es un botón aparte, enfocable por separado del mensaje. */
  readonly accion?: {
    readonly titulo: string;
    readonly etiqueta?: string;
    readonly alPulsar: () => void;
  };
}

/**
 * Mensaje que acompaña a una pantalla: aviso global, carencia, confirmación. El mensaje se anuncia solo al
 * aparecer (región viva; `alert` si es aviso o error) y la acción, si la hay, queda fuera de esa región.
 */
export function Banner({ tono = 'info', icono, titulo, texto, accion }: BannerProps) {
  const estilo = ESTILO[tono];
  return (
    <View className={unir('flex-row items-center gap-3 rounded-xl p-3', estilo.caja)}>
      <View
        className={unir(
          'h-8 w-8 items-center justify-center self-start rounded-full',
          estilo.disco,
        )}
      >
        <Icono nombre={icono} tamano={20} tono={estilo.icono} />
      </View>
      <View
        accessible
        accessibilityRole={tono === 'info' ? undefined : 'alert'}
        accessibilityLiveRegion="polite"
        className="flex-1"
      >
        {titulo ? <Texto variante="etiqueta">{titulo}</Texto> : null}
        <Texto>{texto}</Texto>
      </View>
      {accion ? (
        <Boton
          titulo={accion.titulo}
          etiqueta={accion.etiqueta}
          variante="texto"
          onPress={accion.alPulsar}
        />
      ) : null}
    </View>
  );
}
