import { act } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createGestureController } from 'react-native-gesture-handler/jest-utils';

export const Raiz = ({ children }: { children: ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
);

/** Simula un gesto completo (empieza, se activa, se mueve y termina) con los valores dados. */
export async function arrastrar(testID: string, evento: Record<string, number>) {
  const controlador = createGestureController(testID);
  await act(async () => {
    controlador.begin();
    controlador.activate();
    controlador.update(evento);
    controlador.end(evento);
  });
}

/** Simula un toque simple sobre el gesto con ese `testID`. */
export async function tocar(testID: string) {
  const controlador = createGestureController(testID);
  await act(async () => {
    controlador.begin();
    controlador.activate();
    controlador.end();
  });
}
