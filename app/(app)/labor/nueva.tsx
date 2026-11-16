import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { FormularioLabor } from '@/components/formularios/FormularioLabor';
import { EsqueletoDeTarjeta } from '@/components/esqueletos';
import { Pantalla } from '@/components/Pantalla';
import { Vista } from '@/components/Vista';
import { TIPOS_LABOR, type TipoLabor } from '@/db/modelo';
import { useAcciones } from '@/hooks/useAcciones';
import { useHoy } from '@/hooks/useHoy';
import { useCarencia, useUltimasLabores } from '@/hooks/useLabores';
import { useLote } from '@/hooks/useLotes';
import { valoresLaborVacios } from '@/services/formularios';

const esTipo = (valor: string | undefined): valor is TipoLabor =>
  TIPOS_LABOR.some((tipo) => tipo === valor);

/** Registrar una labor del lote `?lote=<id>`; `?tipo=<tipo>` deja elegido el tipo (la que toca hacer). */
export default function NuevaLabor() {
  const { lote: loteId, tipo } = useLocalSearchParams<{ lote: string; tipo?: string }>();
  const router = useRouter();
  const lote = useLote(loteId);
  const { crearLabor } = useAcciones();
  const hoy = useHoy();
  const carencia = useCarencia(loteId);
  const ultimas = useUltimasLabores(loteId);
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
          mensaje: 'No se puede registrar una labor en un lote borrado.',
          icono: 'alert-circle-outline',
        }}
      >
        {(datos) => (
          <FormularioLabor
            fechaSiembra={datos.fecha_siembra}
            valoresIniciales={valoresLaborVacios(hoy, esTipo(tipo) ? tipo : undefined)}
            hoy={hoy}
            carencia={carencia.vista.estado === 'listo' ? carencia.vista.datos : null}
            ultimas={ultimas.vista.estado === 'listo' ? ultimas.vista.datos : undefined}
            lote={{ nombre: datos.nombre, cultivo: datos.cultivo }}
            textoBoton="Registrar labor"
            alGuardar={(labor) => crearLabor(datos.id, labor)}
            alTerminar={() => router.back()}
          />
        )}
      </Vista>
    </Pantalla>
  );
}
