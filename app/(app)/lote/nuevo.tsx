import { useRouter } from 'expo-router';
import { FormularioLote } from '@/components/formularios/FormularioLote';
import { Pantalla } from '@/components/Pantalla';
import { useAcciones } from '@/hooks/useAcciones';
import { useHoy } from '@/hooks/useHoy';
import { valoresLoteVacios } from '@/services/formularios';

/** Registrar un lote, con ubicación y altitud medidas «aquí» o escritas a mano (RF-02). */
export default function NuevoLote() {
  const router = useRouter();
  const { crearLote } = useAcciones();
  const hoy = useHoy();
  return (
    <Pantalla desplazable={false} relleno={false}>
      <FormularioLote
        valoresIniciales={valoresLoteVacios(hoy)}
        hoy={hoy}
        textoBoton="Crear lote"
        alGuardar={crearLote}
        alTerminar={() => router.back()}
      />
    </Pantalla>
  );
}
