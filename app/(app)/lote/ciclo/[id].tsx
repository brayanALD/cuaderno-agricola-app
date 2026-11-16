import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormularioCiclo } from '@/components/formularios/FormularioCiclo';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { Vista } from '@/components/Vista';
import { useAcciones } from '@/hooks/useAcciones';
import { useHoy } from '@/hooks/useHoy';
import { useLote } from '@/hooks/useLotes';

/** Cerrar el ciclo de cultivo en curso de un lote y empezar el siguiente (D95). */
export default function CerrarCiclo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lote = useLote(id);
  const { cerrarCiclo } = useAcciones();
  const hoy = useHoy();
  return (
    <Pantalla>
      <Vista
        carga={lote}
        vacio={{
          titulo: 'Este lote ya no existe',
          mensaje: 'No se puede cerrar el ciclo de un lote borrado.',
          icono: 'alert-circle-outline',
        }}
      >
        {(datos) => (
          <>
            <Texto variante="ayuda">
              Se guardará el ciclo de {datos.cultivo} con los kilos cosechados hasta la fecha de
              cierre. Las labores se conservan y el lote empieza un ciclo nuevo.
            </Texto>
            <FormularioCiclo
              fechaSiembra={datos.fecha_siembra}
              cultivoActual={datos.cultivo}
              hoy={hoy}
              alGuardar={(cierre) => cerrarCiclo(datos.id, cierre)}
              alTerminar={() => router.back()}
            />
          </>
        )}
      </Vista>
    </Pantalla>
  );
}
