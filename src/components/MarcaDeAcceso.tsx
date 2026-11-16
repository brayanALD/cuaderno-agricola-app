import { Image, View } from 'react-native';
import icono from '../../assets/icon.png';
import { Texto } from './Texto';

/**
 * El logotipo en horizontal (D104, D106): el icono de la app y «Cuaderno de campo». Para el lector de pantalla es un
 * solo elemento con el nombre de la app; el dibujo y las palabras no se leen por separado.
 */
export function MarcaDeAcceso() {
  return (
    <View
      accessible
      accessibilityLabel="Cuaderno de campo"
      className="flex-row items-center gap-3 pb-2"
    >
      <Image source={icono} accessibilityIgnoresInvertColors className="h-16 w-16 rounded-2xl" />
      <View>
        <Texto variante="titulo" accessibilityRole="text">
          Cuaderno
        </Texto>
        <Texto variante="subtitulo" tono="primario">
          de campo
        </Texto>
      </View>
    </View>
  );
}
