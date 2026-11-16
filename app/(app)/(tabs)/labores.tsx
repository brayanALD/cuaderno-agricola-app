import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { Aviso } from '@/components/Aviso';
import { CampoTexto } from '@/components/CampoTexto';
import { FilaLabor } from '@/components/FilaLabor';
import { Pantalla } from '@/components/Pantalla';
import { ProximasLabores } from '@/components/ProximasLabores';
import { Texto } from '@/components/Texto';
import { Vista } from '@/components/Vista';
import { useAccionesLabor } from '@/hooks/useAccionesLabor';
import type { Carga } from '@/hooks/useCarga';
import { useLaboresVisibles } from '@/hooks/useLaboresVisibles';
import type { LaborFila } from '@/db/modelo';

interface CabeceraProps {
  readonly texto: string;
  readonly alCambiarTexto: (texto: string) => void;
  readonly aviso: string | null;
  readonly alAbrirLote: (id: string) => void;
}

function Cabecera({ texto, alCambiarTexto, aviso, alAbrirLote }: CabeceraProps) {
  const buscando = texto.trim() !== '';
  return (
    <View className="gap-4">
      <CampoTexto
        etiqueta="Buscar labor (tipo o nota)"
        valor={texto}
        onChangeText={alCambiarTexto}
      />
      <Aviso texto={aviso} />
      {buscando ? null : <ProximasLabores alAbrirLote={alAbrirLote} />}
      <Texto variante="subtitulo">{buscando ? 'Resultados' : 'Labores recientes'}</Texto>
      {buscando ? null : (
        <Texto variante="ayuda">
          Mantén presionada una labor para duplicarla con la fecha de hoy.
        </Texto>
      )}
    </View>
  );
}

/** Estados de la lista (carga, vacío, error con reintento) cuando no hay filas que mostrar. */
function SinLabores({ carga, texto }: { carga: Carga<LaborFila[]>; texto: string }) {
  const buscando = texto.trim() !== '';
  return (
    <Vista
      carga={carga}
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

/** Labores próximas (RF-03) y recientes, con búsqueda por tipo o nota (D39). */
export default function PantallaLabores() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const { carga, datos, nombres } = useLaboresVisibles(texto);
  const { duplicar, borrar, aviso } = useAccionesLabor();

  return (
    <Pantalla desplazable={false} relleno={false}>
      <FlatList
        data={datos}
        keyExtractor={(labor) => labor.id}
        ListHeaderComponent={
          <Cabecera
            texto={texto}
            alCambiarTexto={setTexto}
            aviso={aviso}
            alAbrirLote={(id) => router.push({ pathname: '/lote/[id]', params: { id } })}
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
