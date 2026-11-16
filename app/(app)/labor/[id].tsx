import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { ElegirVersion } from '@/components/ElegirVersion';
import { EsqueletoDeTarjeta } from '@/components/esqueletos';
import { FormularioLabor } from '@/components/formularios/FormularioLabor';
import { Pantalla } from '@/components/Pantalla';
import { Vista } from '@/components/Vista';
import { useAcciones } from '@/hooks/useAcciones';
import { useHoy } from '@/hooks/useHoy';
import { useCarencia, useLabor } from '@/hooks/useLabores';
import { useLote } from '@/hooks/useLotes';
import { valoresDesdeLabor } from '@/services/formularios';
import type { LaborFila } from '@/db/modelo';

function EditorDeLabor({ labor }: { readonly labor: LaborFila }) {
  const router = useRouter();
  const lote = useLote(labor.lote_id);
  const { actualizarLabor } = useAcciones();
  const hoy = useHoy();
  const carencia = useCarencia(labor.lote_id, labor.id);
  return (
    <Vista
      carga={lote}
      esqueleto={
        <View className="p-4">
          <EsqueletoDeTarjeta />
        </View>
      }
      vacio={{
        titulo: 'El lote de esta labor ya no existe',
        mensaje: 'No se puede editar una labor de un lote borrado.',
        icono: 'alert-circle-outline',
      }}
    >
      {(datos) => (
        <View className="flex-1">
          {labor.conflicto === null ? null : (
            <View className="p-4 pb-0">
              <ElegirVersion entidad="labor" id={labor.id} />
            </View>
          )}
          <FormularioLabor
            // Al elegir la versión del otro dispositivo la labor cambia: el formulario se arma de nuevo con ella.
            key={`${labor.updated_at}:${labor.version_servidor ?? ''}`}
            fechaSiembra={datos.fecha_siembra}
            valoresIniciales={valoresDesdeLabor(labor)}
            hoy={hoy}
            carencia={carencia.vista.estado === 'listo' ? carencia.vista.datos : null}
            lote={{ nombre: datos.nombre, cultivo: datos.cultivo }}
            textoBoton="Guardar cambios"
            alGuardar={(cambios) => actualizarLabor(labor.id, cambios)}
            alTerminar={() => router.back()}
          />
        </View>
      )}
    </Vista>
  );
}

export default function EditarLabor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const labor = useLabor(id);
  return (
    <Pantalla desplazable={false} relleno={false}>
      <Vista
        carga={labor}
        vacio={{
          titulo: 'Esta labor ya no existe',
          mensaje: 'Pudo borrarse desde otra pantalla.',
          icono: 'alert-circle-outline',
        }}
      >
        {(datos) => <EditorDeLabor labor={datos} />}
      </Vista>
    </Pantalla>
  );
}
