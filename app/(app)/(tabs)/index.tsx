import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { AvisoDePendientes } from '@/components/AvisoDePendientes';
import { BarraDeBusqueda } from '@/components/BarraDeBusqueda';
import { EsqueletoDeLotes } from '@/components/esqueletos';
import { Fab } from '@/components/Fab';
import { FilaLote } from '@/components/FilaLote';
import { Pantalla } from '@/components/Pantalla';
import { PanelResumen } from '@/components/PanelResumen';
import { Vista } from '@/components/Vista';
import type { VacioProps } from '@/components/Estados';
import { useProximasLabores } from '@/hooks/useLabores';
import { useLotes } from '@/hooks/useLotes';
import type { LoteConDias } from '@/services/loteService';
import type { Sugerencia } from '@/services/proximaLabor';

/** La labor que toca en cada lote (RF-03), por id de lote, para mostrarla en su tarjeta. */
function useSugerencias(): ReadonlyMap<string, Sugerencia> {
  const { vista } = useProximasLabores();
  return useMemo(
    () =>
      new Map(
        vista.estado === 'listo'
          ? vista.datos.map(({ lote, sugerencia }) => [lote.id, sugerencia] as const)
          : [],
      ),
    [vista],
  );
}

const vacioDeLotes = (texto: string, nuevo: () => void): VacioProps =>
  texto.trim() === ''
    ? {
        titulo: 'Aún no hay lotes',
        mensaje: 'Registra tu primer lote para llevar su bitácora de labores.',
        accion: { titulo: 'Crear mi primer lote', alPulsar: nuevo },
      }
    : {
        titulo: 'Sin resultados',
        mensaje: `Ningún lote coincide con «${texto.trim()}».`,
        icono: 'search-outline',
      };

interface ListaProps {
  readonly datos: readonly LoteConDias[];
  readonly buscando: boolean;
  readonly sugerencias: ReadonlyMap<string, Sugerencia>;
  readonly alAbrir: (id: string) => void;
}

/** Los lotes, con el resumen de la finca arriba (se quita mientras se busca) y margen para el botón flotante. */
function ListaDeLotes({ datos, buscando, sugerencias, alAbrir }: ListaProps) {
  return (
    <FlatList
      data={datos}
      keyExtractor={(lote) => lote.id}
      ListHeaderComponent={buscando ? undefined : <PanelResumen />}
      contentContainerClassName="gap-3 p-4 pb-24"
      keyboardShouldPersistTaps="handled"
      renderItem={({ item }) => (
        <FilaLote lote={item} proxima={sugerencias.get(item.id)} alAbrir={alAbrir} />
      )}
    />
  );
}

/** Lotes con los días desde la siembra y lo que toca hacer, con búsqueda por nombre o cultivo (D39, D104). */
export default function PantallaLotes() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const lotes = useLotes(texto);
  const sugerencias = useSugerencias();
  const buscando = texto.trim() !== '';
  const nuevo = () => router.push('/lote/nuevo');
  // Sin lotes, la propia pantalla vacía ya ofrece crear el primero: no se repite la acción.
  const sinLotes = lotes.vista.estado === 'vacio' && !buscando;

  return (
    <Pantalla desplazable={false} relleno={false}>
      <View className="gap-3 px-4 pt-4">
        <AvisoDePendientes />
        <BarraDeBusqueda etiqueta="Buscar lote o cultivo" valor={texto} alCambiar={setTexto} />
      </View>
      <View className="flex-1">
        <Vista
          carga={lotes}
          esqueleto={
            <View className="p-4">
              <EsqueletoDeLotes />
            </View>
          }
          vacio={vacioDeLotes(texto, nuevo)}
        >
          {(datos) => (
            <ListaDeLotes
              datos={datos}
              buscando={buscando}
              sugerencias={sugerencias}
              alAbrir={(id) => router.push({ pathname: '/lote/[id]', params: { id } })}
            />
          )}
        </Vista>
      </View>
      {sinLotes ? null : <Fab titulo="Nuevo lote" icono="add" onPress={nuevo} />}
    </Pantalla>
  );
}
