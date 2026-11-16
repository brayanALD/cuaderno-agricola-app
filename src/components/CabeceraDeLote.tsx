import { View } from 'react-native';
import { Aviso } from './Aviso';
import { Boton } from './Boton';
import { DeslizarLotes } from './DeslizarLotes';
import { useReporte } from '@/hooks/useReporte';
import { FichaLote, ResumenLote } from './DetalleLote';
import { MensajeError } from './MensajeError';
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
  readonly alCerrarCiclo: () => void;
  readonly alRegistrarLabor: () => void;
}

/** Exporta la bitácora del lote para auditorías o certificaciones (D95). */
function ExportarReporte({ id }: { readonly id: string }) {
  const { generando, error, exportar } = useReporte(id);
  return (
    <View className="gap-2">
      <View className="flex-row flex-wrap gap-2">
        <Boton
          titulo="Exportar PDF"
          icono="document-text-outline"
          variante="secundario"
          cargando={generando === 'pdf'}
          deshabilitado={generando !== null}
          onPress={() => void exportar('pdf')}
        />
        <Boton
          titulo="Exportar CSV"
          icono="grid-outline"
          variante="secundario"
          cargando={generando === 'csv'}
          deshabilitado={generando !== null}
          onPress={() => void exportar('csv')}
        />
      </View>
      <MensajeError texto={error ?? undefined} />
    </View>
  );
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
  alCerrarCiclo,
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
        <Boton
          titulo="Cerrar ciclo"
          icono="refresh-outline"
          variante="secundario"
          onPress={alCerrarCiclo}
        />
      </View>
      <ResumenLote id={id} />
      <ExportarReporte id={id} />
      <Boton titulo="Registrar labor" icono="add" onPress={alRegistrarLabor} />
      <Aviso texto={aviso} />
      <Texto variante="subtitulo">Bitácora de labores</Texto>
      <Texto variante="ayuda">
        Mantén presionada una labor para duplicarla con la fecha de hoy.
      </Texto>
    </View>
  );
}
