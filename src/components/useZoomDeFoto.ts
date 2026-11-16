import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { acotarDesplazamiento, acotarEscala, ESCALA_MIN, escalaPorPasos } from '@/services/gestos';

const DURACION_MS = 150;

interface Tamano {
  readonly ancho: number;
  readonly alto: number;
}

function useValoresDeZoom() {
  const escalaObjetivo = useRef(ESCALA_MIN);
  const fijarObjetivo = useCallback((valor: number) => {
    escalaObjetivo.current = valor;
  }, []);
  const leerObjetivo = useCallback(() => escalaObjetivo.current, []);
  return {
    escala: useSharedValue(1),
    escalaBase: useSharedValue(1),
    x: useSharedValue(0),
    y: useSharedValue(0),
    xBase: useSharedValue(0),
    yBase: useSharedValue(0),
    fijarObjetivo,
    leerObjetivo,
  };
}

type Valores = ReturnType<typeof useValoresDeZoom>;

/** Pellizco para ampliar y, ya ampliada, arrastre con un dedo; los dos a la vez. */
function useGestosDeZoom(v: Valores, tamano: Tamano) {
  const pellizco = usePinchGesture({
    testID: 'gesto-pellizco',
    onBegin: () => {
      'worklet';
      v.escalaBase.set(v.escala.get());
    },
    onUpdate: (evento) => {
      'worklet';
      v.escala.set(acotarEscala(v.escalaBase.get() * evento.scale));
    },
    onDeactivate: () => {
      'worklet';
      v.x.set(acotarDesplazamiento(v.x.get(), tamano.ancho, v.escala.get()));
      v.y.set(acotarDesplazamiento(v.y.get(), tamano.alto, v.escala.get()));
      scheduleOnRN(v.fijarObjetivo, v.escala.get());
    },
  });
  const arrastre = usePanGesture({
    testID: 'gesto-arrastre-foto',
    onBegin: () => {
      'worklet';
      v.xBase.set(v.x.get());
      v.yBase.set(v.y.get());
    },
    onUpdate: (evento) => {
      'worklet';
      v.x.set(
        acotarDesplazamiento(v.xBase.get() + evento.translationX, tamano.ancho, v.escala.get()),
      );
      v.y.set(
        acotarDesplazamiento(v.yBase.get() + evento.translationY, tamano.alto, v.escala.get()),
      );
    },
  });
  return useSimultaneousGestures(pellizco, arrastre);
}

/** Botones «Acercar», «Alejar» y «Restablecer»: la alternativa accesible al pellizco. */
function useControlesDeZoom(v: Valores, tamano: Tamano) {
  const reducido = useReducedMotion();
  const mover = (valor: { set: (n: number) => void }, destino: number) => {
    valor.set(reducido ? destino : withTiming(destino, { duration: DURACION_MS }));
  };

  // Parten de la escala a la que quieren llegar, no de la que la animación lleva a medias:
  // así dos toques rápidos en «Acercar» suman 1 en vez de leer el mismo valor intermedio.
  const cambiarZoom = (pasos: number) => {
    const nueva = escalaPorPasos(v.leerObjetivo(), pasos);
    v.fijarObjetivo(nueva);
    mover(v.escala, nueva);
    mover(v.x, acotarDesplazamiento(v.x.get(), tamano.ancho, nueva));
    mover(v.y, acotarDesplazamiento(v.y.get(), tamano.alto, nueva));
  };

  const restablecer = () => {
    v.fijarObjetivo(ESCALA_MIN);
    mover(v.escala, ESCALA_MIN);
    mover(v.x, 0);
    mover(v.y, 0);
  };

  return { cambiarZoom, restablecer };
}

/** Todo el zoom de la foto: gestos, botones, medida del contenedor y estilo animado. */
export function useZoomDeFoto() {
  const [tamano, setTamano] = useState<Tamano>({ ancho: 0, alto: 0 });
  const valores = useValoresDeZoom();
  const gestos = useGestosDeZoom(valores, tamano);
  const controles = useControlesDeZoom(valores, tamano);

  const alMedir = (evento: LayoutChangeEvent) => {
    const { width, height } = evento.nativeEvent.layout;
    setTamano({ ancho: width, alto: height });
  };

  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateX: valores.x.get() },
      { translateY: valores.y.get() },
      { scale: valores.escala.get() },
    ],
  }));

  return { gestos, estilo, alMedir, ...controles };
}
