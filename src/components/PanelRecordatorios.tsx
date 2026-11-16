import { Linking, Switch, View } from 'react-native';
import { useRecordatorios } from '@/hooks/useRecordatorios';
import { useColores } from '@/theme/EsquemaProvider';
import { Boton } from './Boton';
import { CampoHora } from './CampoHora';
import { MensajeError } from './MensajeError';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

/** Recordatorio de riego (RF-06): interruptor y hora. El permiso solo se pide al encenderlo. */
export function PanelRecordatorios() {
  const { config, error, sinPermiso, alternar, cambiarHora } = useRecordatorios();
  const colores = useColores();
  return (
    <Tarjeta>
      <Texto variante="titulo">Recordatorio de riego</Texto>
      <Texto variante="ayuda">
        Te avisa a la hora elegida cuando toca regar cada lote: 3 días después del último riego de
        la bitácora. Los avisos se calculan en este teléfono, también sin conexión.
      </Texto>
      <View className="min-h-[48px] flex-row items-center justify-between gap-4">
        <Texto className="flex-1">Activar recordatorios</Texto>
        <Switch
          value={config.activo}
          onValueChange={(activar) => void alternar(activar)}
          accessibilityLabel="Activar recordatorios de riego"
          trackColor={{ false: colores.border, true: colores.primary }}
          thumbColor={colores.surface}
        />
      </View>
      <CampoHora
        etiqueta="Hora del aviso"
        valor={config.hora}
        onChange={(hora) => void cambiarHora(hora)}
        deshabilitado={!config.activo}
      />
      <MensajeError texto={error ?? undefined} />
      {sinPermiso ? (
        <Boton
          titulo="Abrir ajustes del teléfono"
          icono="settings-outline"
          variante="secundario"
          onPress={() => void Linking.openSettings()}
        />
      ) : null}
    </Tarjeta>
  );
}
