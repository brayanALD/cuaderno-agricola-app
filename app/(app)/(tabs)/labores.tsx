import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Aviso } from '@/components/Aviso';
import { AvisoDePendientes } from '@/components/AvisoDePendientes';
import { BarraDeBusqueda } from '@/components/BarraDeBusqueda';
import { ConsejoDeGestos } from '@/components/ConsejoDeGestos';
import { EsqueletoDeLabores } from '@/components/esqueletos';
import { FilaLabor } from '@/components/FilaLabor';
import { FiltroPorTipo } from '@/components/FiltroPorTipo';
import { Pantalla } from '@/components/Pantalla';
import { ProximasLabores } from '@/components/ProximasLabores';
import { Texto } from '@/components/Texto';
import { Vista } from '@/components/Vista';
import type { LaborFila, TipoLabor } from '@/db/modelo';
import { useAccionesLabor } from '@/hooks/useAccionesLabor';
import type { Carga } from '@/hooks/useCarga';
import { useLaboresVisibles } from '@/hooks/useLaboresVisibles';

interface CabeceraProps {
  readonly texto: string;
  readonly alCambiarTexto: (texto: string) => void;
  readonly tipo: TipoLabor | null;
  readonly alElegirTipo: (tipo: TipoLabor | null) => void;
  readonly aviso: string | null;
  readonly alAbrirLote: (id: string) => void;
  readonly alRegistrar: (loteId: string, tipo: TipoLabor) => void;
}

function Cabecera({
  texto,
  alCambiarTexto,
  tipo,
  alElegirTipo,
  aviso,
  ...acciones
}: CabeceraProps) {
  const buscando = texto.trim() !== '';
  return (
    <View className="gap-4">
      <BarraDeBusqueda
        etiqueta="Buscar labor (tipo o nota)"
        valor={texto}
        alCambiar={alCambiarTexto}
      />
      <AvisoDePendientes />
      <Aviso texto={aviso} />
      {buscando ? null : <FiltroPorTipo tipo={tipo} alElegir={alElegirTipo} />}
      {buscando ? null : <ProximasLabores tipo={tipo} {...acciones} />}
      <Texto variante="subtitulo">{buscando ? 'Resultados' : 'Recientes'}</Texto>
      {buscando ? null : <ConsejoDeGestos />}
    </View>
  );
}

/** Estados de la lista (carga, vacío, error con reintento) cuando no hay filas que mostrar. */
function SinLabores({ carga, texto }: { carga: Carga<LaborFila[]>; texto: string }) {
  const buscando = texto.trim() !== '';
  return (
    <Vista
      carga={carga}
      esqueleto={<EsqueletoDeLabores />}
      vacio={{
        titulo: buscando ? 'Sin resultados' : 'Aún no hay labores',
        mensaje: buscando
          ? `Ninguna labor coincide con «${texto.trim()}».`
          : 'Entra a un lote y registra su primera labor.',
        icono: buscando ? 'search-outline' : 'calendar-outline',
      }}
    >
      {() => null}
    </Vista>
  );
}

/** Labores que tocan (vencidas, de hoy, próximas) y recientes, con búsqueda y filtro por tipo (D39, D104). */
export default function PantallaLabores() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [tipo, setTipo] = useState<TipoLabor | null>(null);
  const { carga, datos, nombres } = useLaboresVisibles(texto);
  const { duplicar, borrar, aviso } = useAccionesLabor();
  const recientes =
    tipo === null || texto.trim() !== '' ? datos : datos.filter((l) => l.tipo === tipo);

  return (
    <Pantalla desplazable={false} relleno={false}>
      <FlatList
        data={recientes}
        keyExtractor={(labor) => labor.id}
        ListHeaderComponent={
          <Cabecera
            texto={texto}
            alCambiarTexto={setTexto}
            tipo={tipo}
            alElegirTipo={setTipo}
            aviso={aviso}
            alAbrirLote={(id) => router.push({ pathname: '/lote/[id]', params: { id } })}
            alRegistrar={(lote, tipoDeLabor) =>
              router.push({ pathname: '/labor/nueva', params: { lote, tipo: tipoDeLabor } })
            }
          />
        }
        ListEmptyComponent={<SinLabores carga={carga} texto={texto} />}
        contentContainerClassName="gap-3 p-4 pb-8"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <FilaLabor
            labor={item}
            nombreDeLote={nombres.get(item.lote_id)}
            alEditar={(id) => router.push({ pathname: '/labor/[id]', params: { id } })}
            alDuplicar={(id) => void duplicar(id)}
            alBorrar={borrar}
            alVerFoto={(id) => router.push({ pathname: '/foto/[id]', params: { id } })}
          />
        )}
      />
    </Pantalla>
  );
}
