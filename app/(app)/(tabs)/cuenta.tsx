import { useState } from 'react';
import { View } from 'react-native';
import { Boton } from '@/components/Boton';
import { MensajeError } from '@/components/MensajeError';
import { Pantalla } from '@/components/Pantalla';
import { PanelApariencia } from '@/components/PanelApariencia';
import { PanelRecordatorios } from '@/components/PanelRecordatorios';
import { PanelSincronizacion } from '@/components/PanelSincronizacion';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { useSesion } from '@/context/SesionContext';
import { useSincronizacion } from '@/context/SincronizacionContext';

/** Quién tiene la sesión abierta: una inicial en un círculo tonal y el correo (D104). */
function PerfilDeSesion({ correo }: { readonly correo: string }) {
  return (
    <Tarjeta className="flex-row items-center gap-3">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
        <Texto variante="subtitulo">{correo.slice(0, 1).toUpperCase()}</Texto>
      </View>
      <View className="flex-1">
        <Texto variante="etiqueta">{correo}</Texto>
        <Texto variante="ayuda">Sesión iniciada</Texto>
      </View>
    </Tarjeta>
  );
}

/** Sesión, sincronización, recordatorios y apariencia. Cerrar la sesión conserva los datos locales (D60). */
export default function PantallaCuenta() {
  const { usuario, cerrarSesion } = useSesion();
  const sync = useSincronizacion();
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setError(null);
    cerrarSesion().catch(() => setError('No se pudo cerrar la sesión. Inténtalo de nuevo.'));
  };

  return (
    <Pantalla>
      <PerfilDeSesion correo={usuario?.email ?? ''} />
      <PanelSincronizacion sync={sync} />
      <PanelRecordatorios />
      <PanelApariencia />
      <View className="mt-2 gap-2">
        <MensajeError texto={error ?? undefined} />
        <Boton
          titulo="Cerrar sesión"
          variante="peligroSuave"
          icono="log-out-outline"
          onPress={cerrar}
        />
        <Texto variante="ayuda" className="text-center">
          Al cerrar sesión, tus lotes y labores se quedan guardados en este teléfono. Volverás a
          verlos al iniciar sesión con la misma cuenta.
        </Texto>
      </View>
    </Pantalla>
  );
}
