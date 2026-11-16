import { useCallback, useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { usePanGesture } from 'react-native-gesture-handler';
import {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { decidirSnap, resistencia, type DestinoSnap } from '@/services/gestos';

/** Regreso o entrada de la ficha: resorte sin rebote exagerado (la ficha no lleva inercia). */
const RESORTE = { duration: 400, dampingRatio: 0.8 } as const;
const SALIDA_MS = 150;

type Destino = 'anterior' | 'siguiente';

/** Saca la ficha de la pantalla y, al terminar la animación, avisa del cambio (en el hilo de UI). */
function salirYCambiar(
  x: SharedValue<number>,
  destino: Destino,
  ancho: number,
  cambiar: (d: Destino) => void,
) {
  'worklet';
  const objetivo = destino === 'siguiente' ? -ancho : ancho;
  x.set(
    withTiming(objetivo, { duration: SALIDA_MS }, (termino) => {
      'worklet';
      if (termino) scheduleOnRN(cambiar, destino);
    }),
  );
}

/** La ficha nueva entra desde el lado contrario al que salió la anterior. */
function useEntradaDeFicha(
  x: SharedValue<number>,
  claveActual: string,
  consumirPendiente: () => DestinoSnap,
  ancho: number,
  reducido: boolean,
) {
  useEffect(() => {
    const destino = consumirPendiente();
    if (destino === 'quedarse') return;
    if (reducido) {
      x.set(0);
      return;
    }
    x.set(destino === 'siguiente' ? ancho : -ancho);
    x.set(withSpring(0, RESORTE));
  }, [claveActual, ancho, reducido, consumirPendiente, x]);
}

function useGestoDeslizar(
  x: SharedValue<number>,
  ancho: number,
  vecinos: { hayAnterior: boolean; haySiguiente: boolean },
  cambiar: (destino: Destino) => void,
) {
  const { hayAnterior, haySiguiente } = vecinos;
  return usePanGesture({
    testID: 'gesto-deslizar-lotes',
    activeOffsetX: [-12, 12],
    failOffsetY: [-16, 16],
    onUpdate: (evento) => {
      'worklet';
      x.set(resistencia(evento.translationX, evento.translationX < 0 ? haySiguiente : hayAnterior));
    },
    onDeactivate: (evento) => {
      'worklet';
      const destino = decidirSnap({
        traslacionX: evento.translationX,
        velocidadX: evento.velocityX,
        ancho,
        hayAnterior,
        haySiguiente,
      });
      if (destino === 'quedarse') x.set(withSpring(0, RESORTE));
      else salirYCambiar(x, destino, ancho, cambiar);
    },
  });
}

export interface OpcionesDeslizamiento {
  readonly claveActual: string;
  readonly hayAnterior: boolean;
  readonly haySiguiente: boolean;
  readonly alCambiar: (destino: Destino) => void;
}

/** Gesto de pan con snap, estilo animado y la función `ir` que usan los botones de la misma acción. */
export function useDeslizamiento({
  claveActual,
  hayAnterior,
  haySiguiente,
  alCambiar,
}: OpcionesDeslizamiento) {
  const { width: ancho } = useWindowDimensions();
  const reducido = useReducedMotion();
  const x = useSharedValue(0);
  const pendiente = useRef<DestinoSnap>('quedarse');

  const cambiar = useCallback(
    (destino: Destino) => {
      pendiente.current = destino;
      alCambiar(destino);
    },
    [alCambiar],
  );

  const consumirPendiente = useCallback((): DestinoSnap => {
    const destino = pendiente.current;
    pendiente.current = 'quedarse';
    return destino;
  }, []);

  useEntradaDeFicha(x, claveActual, consumirPendiente, ancho, reducido);
  const gesto = useGestoDeslizar(x, ancho, { hayAnterior, haySiguiente }, cambiar);

  const ir = (destino: Destino) => {
    if (reducido) cambiar(destino);
    else salirYCambiar(x, destino, ancho, cambiar);
  };

  const estilo = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
    opacity: 1 - Math.min(0.4, (Math.abs(x.get()) / Math.max(ancho, 1)) * 0.6),
  }));

  return { gesto, estilo, ir };
}
