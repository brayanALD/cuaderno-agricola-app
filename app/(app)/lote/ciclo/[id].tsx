import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { EsqueletoDeTarjeta } from '@/components/esqueletos';
import { FormularioCiclo } from '@/components/formularios/FormularioCiclo';
import { Pantalla } from '@/components/Pantalla';
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
    <Pantalla desplazable={false} relleno={false}>
      <Vista
        carga={lote}
        esqueleto={
          <View className="p-4">
            <EsqueletoDeTarjeta />
          </View>
        }
        vacio={{
          titulo: 'Este lote ya no existe',
          mensaje: 'No se puede cerrar el ciclo de un lote borrado.',
          icono: 'alert-circle-outline',
        }}
      >
        {(datos) => (
          <FormularioCiclo
            fechaSiembra={datos.fecha_siembra}
            cultivoActual={datos.cultivo}
            hoy={hoy}
            alGuardar={(cierre) => cerrarCiclo(datos.id, cierre)}
            alTerminar={() => router.back()}
          />
        )}
      </Vista>
    </Pantalla>
  );
}
