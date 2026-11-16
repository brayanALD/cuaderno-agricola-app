// Corre ANTES del setup de Gesture Handler (setupFiles va en orden).
// Con el resolvedor de Reanimated, worklets carga su versión «web» y `getUIRuntimeHolder` lanza.
// Gesture Handler solo lo usa para enlazar el hilo de UI nativo, que en Jest no existe.
// Se simulan las dos rutas, igual que hace su propio jestSetup: `src` y `lib/module`.
jest.mock('react-native-gesture-handler/src/handlers/gestures/installUIRuntimeBindings', () => ({
  installUIRuntimeBindings: () => undefined,
}));
jest.mock(
  'react-native-gesture-handler/lib/module/handlers/gestures/installUIRuntimeBindings',
  () => ({ installUIRuntimeBindings: () => undefined }),
);
