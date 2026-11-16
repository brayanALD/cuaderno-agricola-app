import { useState } from 'react';
import { View } from 'react-native';
import { useAcciones } from '@/hooks/useAcciones';
import type { EntidadConConflicto, Eleccion } from '@/services/conflictoService';
import { Boton } from './Boton';
import { Texto } from './Texto';

const NOMBRE: Record<EntidadConConflicto, string> = { lote: 'Este lote', labor: 'Esta labor' };

/**
 * Se muestra cuando otro teléfono cambió esto mientras aquí había cambios sin enviar (D96). Hasta que el usuario
 * elige, no se envía ni se pisa nada: «mía» se enviará en la próxima sincronización y «del otro» descarta los
 * cambios de este teléfono.
 */
export function ElegirVersion({
  entidad,
  id,
}: {
  readonly entidad: EntidadConConflicto;
  readonly id: string;
}) {
  const { resolverConflicto } = useAcciones();
  const [ocupado, setOcupado] = useState(false);

  const elegir = async (eleccion: Eleccion) => {
    setOcupado(true);
    try {
      await resolverConflicto(entidad, id, eleccion);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <View className="gap-2" accessibilityLiveRegion="polite">
      <Texto>
        {NOMBRE[entidad]} se cambió en otro dispositivo mientras tenías cambios sin enviar. Elige
        qué versión conservar:
      </Texto>
      <Boton
        titulo="Quedarme con la mía"
        icono="phone-portrait-outline"
        variante="secundario"
        deshabilitado={ocupado}
        onPress={() => void elegir('mia')}
      />
      <Boton
        titulo="Usar la del otro dispositivo"
        icono="cloud-download-outline"
        variante="secundario"
        deshabilitado={ocupado}
        onPress={() => void elegir('servidor')}
      />
    </View>
  );
}
