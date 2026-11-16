import { styled } from 'nativewind';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { unir } from './unir';

/**
 * NativeWind v5 solo envuelve los componentes de `react-native`: el `SafeAreaView` de
 * `react-native-safe-area-context` ignoraba su `className` (sin `flex-1` el `ScrollView` interno se
 * quedaba sin altura y la pantalla se veía en blanco). `styled` lo envuelve y traduce `className` a `style`.
 */
const SafeAreaConEstilos = styled(SafeAreaView);

interface PantallaProps {
  readonly children: ReactNode;
  /** `false` para pantallas con su propia lista o gesto a pantalla completa. */
  readonly desplazable?: boolean;
  /**
   * `false` quita el margen y la separación del contenido cuando la pantalla no se desplaza: para una lista
   * que ya trae su propio margen (si no, queda doble: 16 + 16 px). `className` solo afecta al contenedor externo.
   */
  readonly relleno?: boolean;
  readonly className?: string;
}

/** Fondo y márgenes de toda pantalla. El borde superior lo cubre el encabezado del navegador. */
export function Pantalla({
  children,
  desplazable = true,
  relleno = true,
  className,
}: PantallaProps) {
  return (
    <SafeAreaConEstilos
      edges={['bottom', 'left', 'right']}
      className={unir('flex-1 bg-background', className)}
    >
      {desplazable ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 p-4 pb-8"
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View testID="pantalla-contenido" className={relleno ? 'flex-1 gap-4 p-4' : 'flex-1'}>
          {children}
        </View>
      )}
    </SafeAreaConEstilos>
  );
}
