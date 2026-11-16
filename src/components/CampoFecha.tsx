import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, View } from 'react-native';
import { esFechaValida, fechaDesdeISO, fechaLocalISO, formatearFecha } from '@/services/fechas';
import { Boton } from './Boton';
import { Icono } from './Icono';
import { MensajeError } from './MensajeError';
import { Texto } from './Texto';
import { unir } from './unir';

export interface CampoFechaProps {
  readonly etiqueta: string;
  /** `AAAA-MM-DD`, o vacío si todavía no hay fecha. */
  readonly valor: string;
  readonly onChange: (fecha: string) => void;
  /** Hoy en `AAAA-MM-DD`: abre el calendario ahí si no hay fecha y alimenta el botón «Hoy». */
  readonly hoy: string;
  /** Última fecha elegible (p. ej. hoy, para labores realizadas). */
  readonly maxima?: string;
  readonly error?: string;
}

/** Fecha con el calendario nativo de Android (D50): no se puede escribir una fecha inexistente. */
export function CampoFecha({ etiqueta, valor, onChange, hoy, maxima, error }: CampoFechaProps) {
  const hayFecha = esFechaValida(valor);
  const texto = hayFecha ? formatearFecha(valor) : 'Sin fecha';

  const abrirCalendario = () => {
    DateTimePickerAndroid.open({
      value: fechaDesdeISO(hayFecha ? valor : hoy),
      mode: 'date',
      maximumDate: maxima === undefined ? undefined : fechaDesdeISO(maxima),
      // `onChange` está obsoleto en la librería (H4): solo se llama a `onValueChange` cuando se ELIGE una fecha;
      // cerrar el calendario sin elegir no avisa de nada.
      onValueChange: (_evento, elegida) => onChange(fechaLocalISO(elegida)),
    });
  };

  return (
    <View className="gap-1">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${etiqueta}: ${texto}. Cambiar`}
          onPress={abrirCalendario}
          className={unir(
            'min-h-[48px] flex-1 flex-row items-center gap-2 rounded-xl border-2 bg-surface px-4',
            error ? 'border-danger' : 'border-border focus:border-focus',
          )}
        >
          <Icono nombre="calendar-outline" />
          <Texto variante="cuerpo">{texto}</Texto>
        </Pressable>
        <Boton
          titulo="Hoy"
          etiqueta="Usar la fecha de hoy"
          variante="secundario"
          onPress={() => onChange(hoy)}
        />
      </View>
      <MensajeError texto={error} />
    </View>
  );
}
