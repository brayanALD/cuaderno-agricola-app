import { Pressable, View } from 'react-native';
import { TIPOS_LABOR, type TipoLabor } from '@/db/modelo';
import { ETIQUETA_TIPO } from '@/services/etiquetas';
import { Icono } from './Icono';
import { ICONO_TIPO } from './iconosDeLabor';
import { MensajeError } from './MensajeError';
import { Texto } from './Texto';
import { unir } from './unir';

export interface SelectorDeTipoProps {
  readonly valor: TipoLabor;
  readonly onChange: (tipo: TipoLabor) => void;
  readonly error?: string;
}

/**
 * Tipo de labor en una rejilla de 3 columnas: icono y nombre en tiles de 76 dp (más fáciles de acertar que
 * un botón en fila, Fitts). Lo elegido lleva fondo suave, borde y una marca (✓); TalkBack lo lee como «marcado».
 */
export function SelectorDeTipo({ valor, onChange, error }: SelectorDeTipoProps) {
  return (
    <View className="gap-1">
      <Texto variante="etiqueta">Tipo de labor</Texto>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Tipo de labor"
        className="flex-row flex-wrap gap-2"
      >
        {TIPOS_LABOR.map((tipo) => {
          const activo = tipo === valor;
          return (
            <Pressable
              key={tipo}
              accessibilityRole="radio"
              accessibilityLabel={ETIQUETA_TIPO[tipo]}
              accessibilityState={{ checked: activo }}
              onPress={() => onChange(tipo)}
              className={unir(
                'min-h-[76px] w-[31.5%] items-center justify-center gap-1.5 rounded-xl border-2 px-1 focus:border-focus',
                activo
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-surface active:bg-surface-muted',
              )}
            >
              {activo ? (
                <View className="absolute right-1.5 top-1.5">
                  <Icono nombre="checkmark" tamano={16} tono="primary" />
                </View>
              ) : null}
              <Icono
                nombre={ICONO_TIPO[tipo]}
                tamano={28}
                tono={activo ? 'primary' : 'textMuted'}
              />
              <Texto variante="etiqueta">{ETIQUETA_TIPO[tipo]}</Texto>
            </Pressable>
          );
        })}
      </View>
      <MensajeError texto={error} />
    </View>
  );
}
