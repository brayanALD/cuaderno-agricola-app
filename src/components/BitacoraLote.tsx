import type { ReactElement } from 'react';
import { FlatList } from 'react-native';
import { useLaboresDeLote } from '@/hooks/useLabores';
import { FilaLabor, type FilaLaborProps } from './FilaLabor';
import { Vista } from './Vista';

export type AccionesFilaLabor = Pick<
  FilaLaborProps,
  'alEditar' | 'alDuplicar' | 'alBorrar' | 'alVerFoto'
>;

interface BitacoraLoteProps {
  readonly loteId: string;
  /** Ficha, resumen y acciones: van como encabezado de la lista para que toda la pantalla sea una sola lista. */
  readonly cabecera: ReactElement;
  readonly acciones: AccionesFilaLabor;
}

/**
 * Bitácora de labores del lote. Es una `FlatList` (virtualizada: un lote acumula muchas labores en una
 * temporada y el Redmi A2 tiene 1,8 GB) con los 4 estados dentro de la lista.
 */
export function BitacoraLote({ loteId, cabecera, acciones }: BitacoraLoteProps) {
  const labores = useLaboresDeLote(loteId);
  const datos = labores.vista.estado === 'listo' ? labores.vista.datos : [];
  return (
    <FlatList
      data={datos}
      keyExtractor={(labor) => labor.id}
      ListHeaderComponent={cabecera}
      ListEmptyComponent={
        <Vista
          carga={labores}
          vacio={{
            titulo: 'Aún no hay labores',
            mensaje: 'Registra el primer riego, abono o cosecha de este lote.',
          }}
        >
          {() => null}
        </Vista>
      }
      contentContainerClassName="gap-3 p-4 pb-8"
      renderItem={({ item }) => <FilaLabor labor={item} {...acciones} />}
    />
  );
}
