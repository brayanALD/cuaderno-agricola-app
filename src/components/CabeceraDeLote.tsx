import { View } from 'react-native';
import { Aviso } from './Aviso';
import { Boton } from './Boton';
import { DeslizarLotes } from './DeslizarLotes';
import { FichaLote, ResumenLote } from './DetalleLote';
import { Texto } from './Texto';

export interface CabeceraDeLoteProps {
  readonly id: string;
  readonly posicion: string;
  readonly hayAnterior: boolean;
  readonly haySiguiente: boolean;
  readonly aviso: string | null;
  readonly alCambiarDeLote: (destino: 'anterior' | 'siguiente') => void;
  readonly alEditar: () => void;
  readonly alBorrar: () => void;
  readonly alRegistrarLabor: () => void;
}

/** Ficha deslizable, acciones del lote, resumen (próxima labor y producción) y encabezado de la bitácora. */
export function CabeceraDeLote({
  id,
  posicion,
  hayAnterior,
  haySiguiente,
  aviso,
  alCambiarDeLote,
  alEditar,
  alBorrar,
  alRegistrarLabor,
}: CabeceraDeLoteProps) {
  return (
    <View className="gap-4">
      <DeslizarLotes
        claveActual={id}
        hayAnterior={hayAnterior}
        haySiguiente={haySiguiente}
        posicion={posicion}
        alCambiar={alCambiarDeLote}
      >
        <FichaLote id={id} />
      </DeslizarLotes>
      <View className="flex-row flex-wrap gap-2">
        <Boton titulo="Editar" icono="create-outline" variante="secundario" onPress={alEditar} />
        <Boton titulo="Borrar lote" icono="trash-outline" variante="peligro" onPress={alBorrar} />
      </View>
      <ResumenLote id={id} />
      <Boton titulo="Registrar labor" icono="add" onPress={alRegistrarLabor} />
      <Aviso texto={aviso} />
      <Texto variante="subtitulo">Bitácora de labores</Texto>
      <Texto variante="ayuda">
        Mantén presionada una labor para duplicarla con la fecha de hoy.
      </Texto>
    </View>
  );
}
