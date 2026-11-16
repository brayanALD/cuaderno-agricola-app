import { useState } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useInsetInferior } from '@/hooks/useInsetInferior';
import { Boton } from './Boton';
import { BotonIcono } from './BotonIcono';
import { Esqueleto, GrupoEsqueleto } from './Esqueleto';
import { Icono } from './Icono';
import { Texto } from './Texto';
import { useZoomDeFoto } from './useZoomDeFoto';

export interface VisorFotoProps {
  readonly uri: string;
  /** Qué muestra la foto, para el lector de pantalla. */
  readonly descripcion: string;
}

type EstadoDeFoto = 'cargando' | 'lista' | 'fallida';

/** La foto no se pudo traer: dice por qué puede ser y deja reintentar (no un hueco vacío). */
function FotoNoDisponible({ alReintentar }: { readonly alReintentar: () => void }) {
  return (
    <View
      accessibilityRole="alert"
      accessible
      className="flex-1 items-center justify-center gap-3 p-6"
    >
      <View className="h-20 w-20 items-center justify-center rounded-full bg-surface-muted">
        <Icono nombre="image-outline" tamano={32} tono="textMuted" />
      </View>
      <Texto variante="subtitulo">Foto no disponible</Texto>
      <Texto tono="tenue" className="text-center">
        No se pudo cargar la foto. Revisa tu conexión.
      </Texto>
      <Texto variante="ayuda" className="text-center">
        Si la subió otro teléfono, se descargará cuando haya conexión.
      </Texto>
      <Boton titulo="Reintentar" icono="refresh" variante="tonal" onPress={alReintentar} />
    </View>
  );
}

/** La silueta de la foto mientras llega; no tapa los gestos (la foto de debajo ya responde). */
function FotoCargando() {
  return (
    <View pointerEvents="none" className="absolute inset-0 p-4">
      <GrupoEsqueleto className="flex-1 gap-3">
        <Esqueleto className="flex-1 rounded-2xl" />
        <Texto className="text-center" tono="tenue">
          Cargando foto…
        </Texto>
      </GrupoEsqueleto>
    </View>
  );
}

/** «Alejar», «Restablecer» y «Acercar»: la alternativa accesible al pellizco, en una píldora al alcance del pulgar. */
function ControlesDeZoom({
  cambiarZoom,
  restablecer,
}: {
  readonly cambiarZoom: (pasos: number) => void;
  readonly restablecer: () => void;
}) {
  const inferior = useInsetInferior();
  return (
    <View style={{ paddingBottom: inferior }} className="flex-row items-center justify-center">
      <View className="flex-row items-center gap-1 rounded-full border border-divider bg-surface px-2">
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

/**
 * Foto a pantalla completa con zoom. Pellizcar la amplía (gesto de la sección 4) y, ya ampliada, se
 * arrastra con un dedo. Los botones «Acercar», «Alejar» y «Restablecer» hacen lo mismo y son la
 * alternativa accesible. La escala va de 1× a 4×. Muestra su silueta mientras carga y, si falla, un
 * mensaje con «Reintentar» (D104).
 */
export function VisorFoto({ uri, descripcion }: VisorFotoProps) {
  const { gestos, estilo, alMedir, cambiarZoom, restablecer } = useZoomDeFoto();
  const [estado, setEstado] = useState<EstadoDeFoto>('cargando');
  const [intento, setIntento] = useState(0);
  const reintentar = () => {
    setEstado('cargando');
    setIntento((antes) => antes + 1);
  };
  return (
    <View className="flex-1 gap-2 bg-background">
      <View onLayout={alMedir} className="flex-1 overflow-hidden">
        {estado === 'fallida' ? (
          <FotoNoDisponible alReintentar={reintentar} />
        ) : (
          <>
            <GestureDetector gesture={gestos}>
              <Animated.Image
                key={intento}
                testID="foto-ampliable"
                source={{ uri }}
                onLoad={() => setEstado('lista')}
                onError={() => setEstado('fallida')}
                accessibilityLabel={descripcion}
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                style={[{ width: '100%', height: '100%' }, estilo]}
              />
            </GestureDetector>
            {estado === 'cargando' ? <FotoCargando /> : null}
          </>
        )}
      </View>
      <ControlesDeZoom cambiarZoom={cambiarZoom} restablecer={restablecer} />
    </View>
  );
}
