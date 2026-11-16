import { Pressable } from 'react-native';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export interface FabProps {
  readonly titulo: string;
  readonly icono: NombreIcono;
  readonly onPress: () => void;
}

/**
 * Botón flotante extendido: LA acción de la pantalla, abajo a la derecha, al alcance del pulgar (Fitts). Es 56 dp
 * de alto y lleva texto (no solo icono). Se coloca dentro de `Pantalla`; la lista debe dejar margen inferior.
 */
export function Fab({ titulo, icono, onPress }: FabProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={titulo}
      onPress={onPress}
      style={{ elevation: 6 }}
      className="absolute bottom-4 right-4 min-h-[56px] flex-row items-center gap-3 rounded-2xl border-2 border-transparent bg-primary pl-4 pr-5 active:bg-primary-pressed focus:border-focus"
    >
      <Icono nombre={icono} tono="onPrimary" />
      <Texto variante="boton" tono="sobrePrimario">
        {titulo}
      </Texto>
    </Pressable>
  );
}
