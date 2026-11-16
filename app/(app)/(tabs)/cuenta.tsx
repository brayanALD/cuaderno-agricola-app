import { useState } from 'react';
import { Boton } from '@/components/Boton';
import { MensajeError } from '@/components/MensajeError';
import { Pantalla } from '@/components/Pantalla';
import { PanelRecordatorios } from '@/components/PanelRecordatorios';
import { PanelSincronizacion } from '@/components/PanelSincronizacion';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { useSesion } from '@/context/SesionContext';
import { useSincronizacion } from '@/context/SincronizacionContext';

/** Quién tiene la sesión abierta y cómo cerrarla. Cerrarla conserva los datos locales (D60). */
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
      <Tarjeta>
        <Texto variante="etiqueta">Sesión iniciada como</Texto>
        <Texto>{usuario?.email}</Texto>
      </Tarjeta>
      <PanelSincronizacion sync={sync} />
      <PanelRecordatorios />
      <Texto variante="ayuda">
        Al cerrar sesión, tus lotes y labores se quedan guardados en este teléfono. Volverás a
        verlos al iniciar sesión con la misma cuenta.
      </Texto>
      <MensajeError texto={error ?? undefined} />
      <Boton
        titulo="Cerrar sesión"
        variante="secundario"
        icono="log-out-outline"
        onPress={cerrar}
      />
    </Pantalla>
  );
}
