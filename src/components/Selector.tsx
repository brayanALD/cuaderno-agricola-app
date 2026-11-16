import { Pressable, View } from 'react-native';
import { Icono } from './Icono';
import { MensajeError } from './MensajeError';
import { Texto } from './Texto';
import { unir } from './unir';

export interface OpcionSelector<T extends string> {
  readonly valor: T;
  readonly etiqueta: string;
}

export interface SelectorProps<T extends string> {
  readonly etiqueta: string;
  readonly opciones: readonly OpcionSelector<T>[];
  readonly valor: T | null;
  readonly onChange: (valor: T | null) => void;
  /** Pulsar la opción marcada la desmarca (`null`): para campos opcionales como la luz. */
  readonly permitirVacio?: boolean;
  readonly error?: string;
}

/**
 * Grupo de opciones excluyentes. La elegida se distingue por relleno **y** por una marca (✓),
 * y TalkBack la lee como «marcada».
 */
export function Selector<T extends string>({
  etiqueta,
  opciones,
  valor,
  onChange,
  permitirVacio = false,
  error,
}: SelectorProps<T>) {
  const elegir = (opcion: T) => {
    if (opcion !== valor) onChange(opcion);
    else if (permitirVacio) onChange(null);
  };
  return (
    <View className="gap-1">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={etiqueta}
        className="flex-row flex-wrap gap-2"
      >
        {opciones.map((opcion) => {
          const activa = opcion.valor === valor;
          return (
            <Pressable
              key={opcion.valor}
              accessibilityRole="radio"
              accessibilityLabel={opcion.etiqueta}
              accessibilityState={{ checked: activa }}
              onPress={() => elegir(opcion.valor)}
              className={unir(
                'min-h-[48px] flex-row items-center justify-center gap-2 rounded-xl border-2 px-4 focus:border-focus',
                activa
                  ? 'border-primary bg-primary'
                  : 'border-border bg-surface active:bg-surface-muted',
              )}
            >
              {activa ? <Icono nombre="checkmark" tamano={20} tono="onPrimary" /> : null}
              <Texto variante="boton" tono={activa ? 'sobrePrimario' : 'texto'}>
                {opcion.etiqueta}
              </Texto>
            </Pressable>
          );
        })}
      </View>
      <MensajeError texto={error} />
    </View>
  );
}
