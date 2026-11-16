import { useRef, type ComponentRef } from 'react';
import { TextInput, View } from 'react-native';
import {
  GestureDetector,
  useCompetingGestures,
  useTapGesture,
  type PanGesture,
} from 'react-native-gesture-handler';
import { useColores } from '@/theme/EsquemaProvider';
import { Icono } from './Icono';
import { Texto } from './Texto';

interface CajaCantidadProps {
  readonly etiqueta: string;
  /** Lo que se muestra: el texto que se está escribiendo o el valor actual. */
  readonly texto: string;
  readonly unidad?: string;
  readonly gesto: PanGesture;
  readonly onChangeText: (texto: string) => void;
  readonly onBlur: () => void;
}

/**
 * Número que se arrastra (gesto) y también se puede escribir; la unidad va al lado. El campo de texto
 * no recibe toques por sí mismo (H1): si los recibiera, el arrastre que empieza sobre el número nunca
 * llegaría al gesto. Va dentro de un `View` con `pointerEvents="none"` porque el campo nativo de Android
 * ignora esa propiedad. Un toque simple lo enfoca (abre el teclado) y un arrastre cambia el valor.
 */
export function CajaCantidad({
  etiqueta,
  texto,
  unidad,
  gesto,
  onChangeText,
  onBlur,
}: CajaCantidadProps) {
  const colores = useColores();
  const entrada = useRef<ComponentRef<typeof TextInput>>(null);
  const tocar = useTapGesture({
    runOnJS: true,
    testID: 'gesto-tocar-cantidad',
    onActivate: () => entrada.current?.focus(),
  });
  const gestos = useCompetingGestures(gesto, tocar);
  return (
    <GestureDetector gesture={gestos}>
      <View className="min-h-[48px] flex-1 flex-row items-center justify-center gap-2 rounded-xl border-2 border-border bg-surface px-3">
        <Icono nombre="swap-vertical" tono="textMuted" />
        <View pointerEvents="none" testID="campo-cantidad-inerte">
          <TextInput
            ref={entrada}
            accessibilityLabel={etiqueta}
            accessibilityHint="Toca para escribir el valor, arrastra o usa los botones más y menos"
            value={texto}
            onChangeText={onChangeText}
            onBlur={onBlur}
            keyboardType="decimal-pad"
            selectTextOnFocus
            placeholderTextColor={colores.textMuted}
            className="min-w-[64px] text-center text-lg font-semibold text-text"
          />
        </View>
        {unidad ? <Texto tono="tenue">{unidad}</Texto> : null}
      </View>
    </GestureDetector>
  );
}
