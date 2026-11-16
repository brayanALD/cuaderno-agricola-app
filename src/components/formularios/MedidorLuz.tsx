import { View } from 'react-native';
import type { Luz } from '@/db/modelo';
import { Boton } from '../Boton';
import { MensajeError } from '../MensajeError';
import { Texto } from '../Texto';
import { useMedidorLuz } from './useMedidorLuz';

interface Props {
  /** Recibe la opción deducida de la lectura; el usuario puede cambiarla en el selector. */
  readonly alMedir: (luz: Luz) => void;
}

/**
 * Mide la luz con el sensor cuando el usuario lo pide (segunda capacidad, P1). Sin sensor, o si no llega
 * lectura, avisa y deja el selector manual, que es la alternativa de la especificación.
 */
export function MedidorLuz({ alMedir }: Props) {
  const { midiendo, resultado, error, iniciar } = useMedidorLuz(alMedir);
  return (
    <View className="gap-2">
      <Boton
        titulo={midiendo ? 'Midiendo la luz…' : 'Medir la luz con el sensor'}
        icono="sunny-outline"
        variante="secundario"
        cargando={midiendo}
        onPress={iniciar}
      />
      {resultado ? (
        <View accessible accessibilityLiveRegion="polite">
          <Texto variante="ayuda">{resultado}</Texto>
        </View>
      ) : null}
      <MensajeError texto={error ?? undefined} />
    </View>
  );
}
