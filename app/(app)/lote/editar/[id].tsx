import { useLocalSearchParams, useRouter } from 'expo-router';
import { FormularioLote } from '@/components/formularios/FormularioLote';
import { Pantalla } from '@/components/Pantalla';
import { Vista } from '@/components/Vista';
import { useAcciones } from '@/hooks/useAcciones';
import { useHoy } from '@/hooks/useHoy';
import { useLote } from '@/hooks/useLotes';
import { valoresDesdeLote } from '@/services/formularios';

export default function EditarLote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lote = useLote(id);
  const { actualizarLote } = useAcciones();
  const hoy = useHoy();
  return (
    <Pantalla desplazable={false} relleno={false}>
      <Vista
        carga={lote}
        vacio={{
          titulo: 'Este lote ya no existe',
          mensaje: 'Pudo borrarse desde otra pantalla.',
          icono: 'alert-circle-outline',
        }}
      >
        {(datos) => (
          <FormularioLote
            valoresIniciales={valoresDesdeLote(datos)}
            hoy={hoy}
            textoBoton="Guardar cambios"
            alGuardar={(cambios) => actualizarLote(id, cambios)}
            alTerminar={() => router.back()}
          />
        )}
      </Vista>
    </Pantalla>
  );
}
