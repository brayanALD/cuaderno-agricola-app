import { useLocalSearchParams, useRouter } from 'expo-router';
import { BitacoraLote } from '@/components/BitacoraLote';
import { CabeceraDeLote } from '@/components/CabeceraDeLote';
import { Fab } from '@/components/Fab';
import { Pantalla } from '@/components/Pantalla';
import type { TipoLabor } from '@/db/modelo';
import { useAccionesLabor } from '@/hooks/useAccionesLabor';
import { useBorrarLote } from '@/hooks/useBorrarLote';
import { useVecinosDeLote } from '@/hooks/useVecinosDeLote';

/** Ficha del lote: desliza entre lotes, lo que toca hacer, producción y bitácora, con «Registrar labor» a mano. */
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
  const registrarLabor = (tipo?: TipoLabor) =>
    router.push({
      pathname: '/labor/nueva',
      params: tipo === undefined ? { lote: id } : { lote: id, tipo },
    });

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
            alCerrarCiclo={() => router.push({ pathname: '/lote/ciclo/[id]', params: { id } })}
            alRegistrarLabor={registrarLabor}
          />
        }
        acciones={{
          alEditar: (laborId) => router.push({ pathname: '/labor/[id]', params: { id: laborId } }),
          alDuplicar: (laborId) => void acciones.duplicar(laborId),
          alBorrar: acciones.borrar,
          alVerFoto: (laborId) => router.push({ pathname: '/foto/[id]', params: { id: laborId } }),
        }}
      />
      <Fab titulo="Registrar labor" icono="add" onPress={() => registrarLabor()} />
    </Pantalla>
  );
}
