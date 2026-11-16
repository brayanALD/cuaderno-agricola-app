import type { ReactNode } from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { BotonIcono } from './BotonIcono';
import { Texto } from './Texto';
import { useDeslizamiento } from './useDeslizamiento';

export interface DeslizarLotesProps {
  /** Id del lote que se muestra: cuando cambia, la ficha nueva entra desde el lado contrario. */
  readonly claveActual: string;
  readonly hayAnterior: boolean;
  readonly haySiguiente: boolean;
  /** «Lote 2 de 5»: lo lee el lector de pantalla junto a los botones. */
  readonly posicion: string;
  readonly alCambiar: (destino: 'anterior' | 'siguiente') => void;
  readonly children: ReactNode;
}

/**
 * Ficha que sigue al dedo y, al soltar, hace snap al lote vecino o vuelve (gesto de deslizar de la
 * sección 4, decisión D49). Los botones «Lote anterior» y «Lote siguiente» hacen lo mismo y son la
 * alternativa accesible. Con «reducir movimiento» activado, el cambio es inmediato.
 */
export function DeslizarLotes({
  claveActual,
  hayAnterior,
  haySiguiente,
  posicion,
  alCambiar,
  children,
}: DeslizarLotesProps) {
  const { gesto, estilo, ir } = useDeslizamiento({
    claveActual,
    hayAnterior,
    haySiguiente,
    alCambiar,
  });
  return (
    <View className="gap-2">
      <GestureDetector gesture={gesto}>
        <Animated.View testID="ficha-deslizable" style={estilo}>
          {children}
        </Animated.View>
      </GestureDetector>
      <View className="flex-row items-center justify-between">
        <BotonIcono
          icono="chevron-back"
          etiqueta="Lote anterior"
          onPress={() => ir('anterior')}
          deshabilitado={!hayAnterior}
        />
        <Texto tono="tenue" accessibilityLiveRegion="polite">
          {posicion}
        </Texto>
        <BotonIcono
          icono="chevron-forward"
          etiqueta="Lote siguiente"
          onPress={() => ir('siguiente')}
          deshabilitado={!haySiguiente}
        />
      </View>
    </View>
  );
}
