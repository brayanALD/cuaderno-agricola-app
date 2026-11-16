import { useRef } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import { cantidadPorArrastre } from '@/services/cantidad';

/** Píxeles de arrastre vertical que equivalen a un paso. */
export const PX_POR_PASO = 24;

interface Opciones {
  readonly valor: number;
  readonly paso: number;
  readonly max?: number;
  /** Se llama solo cuando el arrastre cruza un paso, no en cada fotograma. */
  readonly alCambiar: (cantidad: number) => void;
}

/**
 * Arrastre vertical que cambia la cantidad de a un paso. Solo se activa con un arrastre vertical
 * claro, para no pelear con el desplazamiento del formulario.
 */
export function useGestoCantidad({ valor, paso, max, alCambiar }: Opciones) {
  const inicio = useRef(valor);
  const ultimo = useRef(valor);

  return usePanGesture({
    runOnJS: true,
    testID: 'gesto-cantidad',
    activeOffsetY: [-10, 10],
    failOffsetX: [-30, 30],
    onBegin: () => {
      inicio.current = valor;
      ultimo.current = valor;
    },
    onUpdate: (evento) => {
      const nuevo = cantidadPorArrastre({
        inicial: inicio.current,
        traslacionY: evento.translationY,
        pxPorPaso: PX_POR_PASO,
        paso,
        max,
      });
      if (nuevo === ultimo.current) return;
      ultimo.current = nuevo;
      alCambiar(nuevo);
    },
  });
}
