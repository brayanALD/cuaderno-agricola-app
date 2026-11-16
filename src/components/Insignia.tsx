import { View } from 'react-native';
import { Texto } from './Texto';

/** Destacado dorado con texto oscuro (6,54:1 en claro, 9,09:1 en oscuro). */
export function Insignia({ children }: { readonly children: string }) {
  return (
    <View className="self-start rounded-full bg-accent px-3 py-1">
      <Texto variante="etiqueta" tono="sobreAcento">
        {children}
      </Texto>
    </View>
  );
}
