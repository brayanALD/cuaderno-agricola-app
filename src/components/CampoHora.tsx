import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, View } from 'react-native';
import { Icono } from './Icono';
import { Texto } from './Texto';
import { unir } from './unir';

export interface CampoHoraProps {
  readonly etiqueta: string;
  /** `HH:MM`, 24 horas. */
  readonly valor: string;
  readonly onChange: (hora: string) => void;
  readonly deshabilitado?: boolean;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Hora con el reloj nativo de Android: no se puede escribir una hora inexistente (como D50 con la fecha). */
export function CampoHora({ etiqueta, valor, onChange, deshabilitado = false }: CampoHoraProps) {
  const abrirReloj = () => {
    const [horas = 0, minutos = 0] = valor.split(':').map(Number);
    const base = new Date();
    base.setHours(horas, minutos, 0, 0);
    DateTimePickerAndroid.open({
      value: base,
      mode: 'time',
      is24Hour: true,
      // Como en la fecha (H4): solo se avisa cuando se ELIGE una hora.
      onValueChange: (_evento, elegida) =>
        onChange(`${dosDigitos(elegida.getHours())}:${dosDigitos(elegida.getMinutes())}`),
    });
  };

  return (
    <View className="gap-1">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${valor}. Cambiar`}
        accessibilityState={{ disabled: deshabilitado }}
        disabled={deshabilitado}
        onPress={abrirReloj}
        className={unir(
          'min-h-[48px] flex-row items-center gap-2 rounded-xl border-2 border-border bg-surface px-4 focus:border-focus',
          deshabilitado && 'opacity-50',
        )}
      >
        <Icono nombre="time-outline" tono="primary" />
        <Texto>{valor}</Texto>
      </Pressable>
    </View>
  );
}
