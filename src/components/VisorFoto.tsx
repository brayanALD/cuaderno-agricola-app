import { useState } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useInsetInferior } from '@/hooks/useInsetInferior';
import { BotonIcono } from './BotonIcono';
import { Texto } from './Texto';
import { useZoomDeFoto } from './useZoomDeFoto';

export interface VisorFotoProps {
  readonly uri: string;
  /** Qué muestra la foto, para el lector de pantalla. */
  readonly descripcion: string;
}

/**
 * Foto a pantalla completa con zoom. Pellizcar la amplía (gesto de la sección 4) y, ya ampliada, se
 * arrastra con un dedo. Los botones «Acercar», «Alejar» y «Restablecer» hacen lo mismo y son la
 * alternativa accesible. La escala va de 1× a 4×.
 */
export function VisorFoto({ uri, descripcion }: VisorFotoProps) {
  const { gestos, estilo, alMedir, cambiarZoom, restablecer } = useZoomDeFoto();
  const [fallida, setFallida] = useState(false);
  const inferior = useInsetInferior();
  return (
    <View className="flex-1 gap-2 bg-background">
      <View onLayout={alMedir} className="flex-1 overflow-hidden">
        {fallida ? (
          <Texto className="p-4 text-center">No se pudo cargar la foto. Revisa tu conexión.</Texto>
        ) : (
          <GestureDetector gesture={gestos}>
            <Animated.Image
              testID="foto-ampliable"
              source={{ uri }}
              onError={() => setFallida(true)}
              accessibilityLabel={descripcion}
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              style={[{ width: '100%', height: '100%' }, estilo]}
            />
          </GestureDetector>
        )}
      </View>
      <View
        style={{ paddingBottom: inferior }}
        className="flex-row items-center justify-center gap-2"
      >
        <BotonIcono
          icono="remove-circle-outline"
          etiqueta="Alejar la foto"
          onPress={() => cambiarZoom(-1)}
        />
        <BotonIcono
          icono="refresh-circle-outline"
          etiqueta="Restablecer el zoom de la foto"
          onPress={restablecer}
        />
        <BotonIcono
          icono="add-circle-outline"
          etiqueta="Acercar la foto"
          onPress={() => cambiarZoom(1)}
        />
      </View>
    </View>
  );
}
