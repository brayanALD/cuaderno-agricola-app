import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, View } from 'react-native';
import { AvisoDePendientes } from '@/components/AvisoDePendientes';
import { Boton } from '@/components/Boton';
import { CampoTexto } from '@/components/CampoTexto';
import { FilaLote } from '@/components/FilaLote';
import { Pantalla } from '@/components/Pantalla';
import { PanelResumen } from '@/components/PanelResumen';
import { Vista } from '@/components/Vista';
import { useLotes } from '@/hooks/useLotes';

/** Lotes con los días desde la siembra, con búsqueda por nombre o cultivo (D39). */
export default function PantallaLotes() {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const lotes = useLotes(texto);
  const buscando = texto.trim() !== '';
  const nuevo = () => router.push('/lote/nuevo');

  return (
    <Pantalla desplazable={false}>
      <AvisoDePendientes />
      <CampoTexto etiqueta="Buscar lote o cultivo" valor={texto} onChangeText={setTexto} />
      <View className="flex-1">
        <Vista
          carga={lotes}
          vacio={
            buscando
              ? {
                  titulo: 'Sin resultados',
                  mensaje: `Ningún lote coincide con «${texto.trim()}».`,
                  icono: 'search-outline',
                }
              : {
                  titulo: 'Aún no hay lotes',
                  mensaje: 'Registra tu primer lote para llevar su bitácora de labores.',
                  accion: { titulo: 'Nuevo lote', alPulsar: nuevo },
                }
          }
        >
          {(datos) => (
            <FlatList
              data={datos}
              keyExtractor={(lote) => lote.id}
              ListHeaderComponent={buscando ? undefined : <PanelResumen />}
              contentContainerClassName="gap-3 pb-4"
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <FilaLote
                  lote={item}
                  alAbrir={(id) => router.push({ pathname: '/lote/[id]', params: { id } })}
                />
              )}
            />
          )}
        </Vista>
      </View>
      <Boton titulo="Nuevo lote" icono="add" onPress={nuevo} />
    </Pantalla>
  );
}
