import { useLocalSearchParams, useRouter } from 'expo-router';
import { BitacoraLote } from '@/components/BitacoraLote';
import { CabeceraDeLote } from '@/components/CabeceraDeLote';
import { Pantalla } from '@/components/Pantalla';
import { useAccionesLabor } from '@/hooks/useAccionesLabor';
import { useBorrarLote } from '@/hooks/useBorrarLote';
import { useVecinosDeLote } from '@/hooks/useVecinosDeLote';

/** Ficha del lote: desliza entre lotes, próxima labor, producción y bitácora de labores. */
export default function DetalleDeLote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { anterior, siguiente, posicion } = useVecinosDeLote(id);
  const acciones = useAccionesLabor();
  const borrarLote = useBorrarLote(id, () => router.back());

  const cambiarDeLote = (destino: 'anterior' | 'siguiente') => {
    const vecino = destino === 'siguiente' ? siguiente : anterior;
    if (vecino) router.setParams({ id: vecino.id });
  };

  return (
    <Pantalla desplazable={false} className="p-0">
      <BitacoraLote
        loteId={id}
        cabecera={
          <CabeceraDeLote
            id={id}
            posicion={posicion}
            hayAnterior={anterior !== undefined}
            haySiguiente={siguiente !== undefined}
            aviso={acciones.aviso}
            alCambiarDeLote={cambiarDeLote}
            alEditar={() => router.push({ pathname: '/lote/editar/[id]', params: { id } })}
            alBorrar={borrarLote}
            alRegistrarLabor={() => router.push({ pathname: '/labor/nueva', params: { lote: id } })}
          />
        }
        acciones={{
          alEditar: (laborId) => router.push({ pathname: '/labor/[id]', params: { id: laborId } }),
          alDuplicar: (laborId) => void acciones.duplicar(laborId),
          alBorrar: acciones.borrar,
          alVerFoto: (laborId) => router.push({ pathname: '/foto/[id]', params: { id: laborId } }),
        }}
      />
    </Pantalla>
  );
}
