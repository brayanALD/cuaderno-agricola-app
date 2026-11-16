import { useState, type ReactElement } from 'react';
import { FlatList, View } from 'react-native';
import type { TipoLabor } from '@/db/modelo';
import { useLaboresDeLote } from '@/hooks/useLabores';
import { ETIQUETA_TIPO } from '@/services/etiquetas';
import { EncabezadoDeBitacora } from './EncabezadoDeBitacora';
import { Vacio } from './Estados';
import { EsqueletoDeLabores } from './esqueletos';
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
 * Bitácora de labores del lote, con filtro por tipo. Es una `FlatList` (virtualizada: un lote acumula muchas
 * labores en una temporada y el Redmi A2 tiene 1,8 GB) con los 4 estados dentro de la lista. El margen inferior
 * deja sitio al botón flotante.
 */
export function BitacoraLote({ loteId, cabecera, acciones }: BitacoraLoteProps) {
  const labores = useLaboresDeLote(loteId);
  const [tipo, setTipo] = useState<TipoLabor | null>(null);
  const datos = labores.vista.estado === 'listo' ? labores.vista.datos : [];
  const visibles = tipo === null ? datos : datos.filter((labor) => labor.tipo === tipo);
  return (
    <FlatList
      data={visibles}
      keyExtractor={(labor) => labor.id}
      ListHeaderComponent={
        <View>
          {cabecera}
          <EncabezadoDeBitacora total={datos.length} tipo={tipo} alElegir={setTipo} />
        </View>
      }
      ListEmptyComponent={
        <Vista
          carga={labores}
          esqueleto={<EsqueletoDeLabores />}
          vacio={{
            titulo: 'Aún no hay labores',
            mensaje: 'Registra el primer riego, abono o cosecha de este lote.',
          }}
        >
          {() => (
            <Vacio
              titulo="Sin resultados"
              mensaje={`Este lote no tiene labores de ${ETIQUETA_TIPO[tipo ?? 'riego'].toLowerCase()}.`}
              icono="filter-outline"
            />
          )}
        </Vista>
      }
      contentContainerClassName="gap-3 p-4 pb-24"
      renderItem={({ item }) => <FilaLabor labor={item} {...acciones} />}
    />
  );
}
