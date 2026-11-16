import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormularioLabor } from '@/components/formularios/FormularioLabor';
import { Pantalla } from '@/components/Pantalla';
import { Vista } from '@/components/Vista';
import { useAcciones } from '@/hooks/useAcciones';
import { useHoy } from '@/hooks/useHoy';
import { useLote } from '@/hooks/useLotes';
import { valoresLaborVacios } from '@/services/formularios';

/** Registrar una labor del lote `?lote=<id>`. */
export default function NuevaLabor() {
  const { lote: loteId } = useLocalSearchParams<{ lote: string }>();
  const router = useRouter();
  const lote = useLote(loteId);
  const { crearLabor } = useAcciones();
  const hoy = useHoy();
  return (
    <Pantalla>
      <Vista
        carga={lote}
        vacio={{
          titulo: 'Este lote ya no existe',
          mensaje: 'No se puede registrar una labor en un lote borrado.',
          icono: 'alert-circle-outline',
        }}
      >
        {(datos) => (
          <FormularioLabor
            fechaSiembra={datos.fecha_siembra}
            valoresIniciales={valoresLaborVacios(hoy)}
            hoy={hoy}
            textoBoton="Registrar labor"
            alGuardar={(labor) => crearLabor(datos.id, labor)}
            alTerminar={() => router.back()}
          />
        )}
      </Vista>
    </Pantalla>
  );
}
