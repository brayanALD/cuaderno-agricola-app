import { View } from 'react-native';
import type { TipoLabor } from '@/db/modelo';
import { useReporte } from '@/hooks/useReporte';
import type { FormatoReporte } from '@/services/reporteService';
import { Aviso } from './Aviso';
import { Banner } from './Banner';
import { DeslizarLotes } from './DeslizarLotes';
import { FichaLote } from './FichaLote';
import { MenuDeAcciones } from './MenuDeAcciones';
import { ResumenLote } from './ResumenLote';

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
  /** Sin tipo, el formulario empieza en riego; con tipo, en el que toca hacer. */
  readonly alRegistrarLabor: (tipo?: TipoLabor) => void;
}

interface MenuProps {
  readonly alEditar: () => void;
  readonly alCerrarCiclo: () => void;
  readonly alBorrar: () => void;
  readonly exportar: (formato: FormatoReporte) => Promise<void>;
}

/** Lo que no se hace a diario, agrupado en un ⋮; «Borrar» va al final, separado y en rojo (Fitts, D105). */
function MenuDeLote({ alEditar, alCerrarCiclo, alBorrar, exportar }: MenuProps) {
  return (
    <MenuDeAcciones
      etiqueta="Más acciones del lote"
      acciones={[
        { titulo: 'Editar lote', icono: 'create-outline', alPulsar: alEditar },
        { titulo: 'Cerrar ciclo', icono: 'refresh-outline', alPulsar: alCerrarCiclo },
        {
          titulo: 'Exportar PDF',
          icono: 'document-text-outline',
          alPulsar: () => void exportar('pdf'),
        },
        { titulo: 'Exportar CSV', icono: 'grid-outline', alPulsar: () => void exportar('csv') },
        { titulo: 'Borrar lote', icono: 'trash-outline', alPulsar: alBorrar, peligro: true },
      ]}
    />
  );
}

/** Mientras se genera el reporte y, si falla, el motivo (D95). */
function EstadoDelReporte({
  generando,
  error,
}: {
  readonly generando: FormatoReporte | null;
  readonly error: string | null;
}) {
  return (
    <>
      {generando === null ? null : (
        <Banner
          icono="document-text-outline"
          texto={`Generando ${generando === 'pdf' ? 'el PDF' : 'el CSV'}…`}
        />
      )}
      {error === null ? null : <Banner tono="error" icono="alert-circle" texto={error} />}
    </>
  );
}

/**
 * Ficha deslizable con el menú del lote, lo que toca hacer, producción y ciclos (D104). La acción frecuente
 * («Registrar labor») es el botón flotante de la pantalla; aquí solo queda lo que informa.
 */
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
  const { generando, error, exportar } = useReporte(id);
  const menu = (
    <MenuDeLote
      alEditar={alEditar}
      alCerrarCiclo={alCerrarCiclo}
      alBorrar={alBorrar}
      exportar={exportar}
    />
  );
  return (
    <View className="gap-4">
      <DeslizarLotes
        claveActual={id}
        hayAnterior={hayAnterior}
        haySiguiente={haySiguiente}
        posicion={posicion}
        alCambiar={alCambiarDeLote}
      >
        <FichaLote id={id} menu={menu} />
      </DeslizarLotes>
      <EstadoDelReporte generando={generando} error={error} />
      <Aviso texto={aviso} />
      <ResumenLote id={id} alRegistrar={alRegistrarLabor} />
    </View>
  );
}
