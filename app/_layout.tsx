import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Cargando } from '@/components/Estados';
import { NavegacionRaiz } from '@/components/NavegacionRaiz';
import { SesionProvider } from '@/context/SesionContext';
import { servicioDeSesionReal } from '@/context/sesionReal';
import { EsquemaProvider } from '@/theme/EsquemaProvider';

import '../global.css';

/** Raíz: gestos, tema, sesión (restaurada sin red) y navegación. La base de datos se abre dentro de `(app)`. */
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <EsquemaProvider>
        <SesionProvider
          servicio={servicioDeSesionReal()}
          cargando={
            <View className="flex-1 bg-background">
              <Cargando />
            </View>
          }
        >
          <NavegacionRaiz />
        </SesionProvider>
      </EsquemaProvider>
    </GestureHandlerRootView>
  );
}
