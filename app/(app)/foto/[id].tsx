import { useLocalSearchParams } from 'expo-router';
import { fotoDe } from '@/components/FilaLabor';
import { Pantalla } from '@/components/Pantalla';
import { Vacio } from '@/components/Estados';
import { Vista } from '@/components/Vista';
import { VisorFoto } from '@/components/VisorFoto';
import { useLabor } from '@/hooks/useLabores';
import { ETIQUETA_TIPO } from '@/services/etiquetas';
import { formatearFecha } from '@/services/fechas';

/** Foto de una labor a pantalla completa, con zoom por pellizco o por botones (gesto 2). */
export default function FotoDeLabor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const labor = useLabor(id);
  return (
    <Pantalla desplazable={false} className="p-0">
      <Vista
        carga={labor}
        vacio={{ titulo: 'Esta labor ya no existe', mensaje: 'Pudo borrarse desde otra pantalla.' }}
      >
        {(datos) =>
          fotoDe(datos) !== null ? (
            <VisorFoto
              uri={fotoDe(datos) ?? ''}
              descripcion={`Foto de la labor de ${ETIQUETA_TIPO[datos.tipo].toLowerCase()} del ${formatearFecha(datos.fecha)}`}
            />
          ) : (
            <Vacio
              titulo="Esta labor no tiene foto"
              mensaje="Edita la labor para elegir una foto de la galería."
              icono="image-outline"
            />
          )
        }
      </Vista>
    </Pantalla>
  );
}
