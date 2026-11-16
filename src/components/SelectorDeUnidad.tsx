import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Boton } from './Boton';
import { CampoTexto } from './CampoTexto';
import { HojaInferior } from './HojaInferior';
import { Icono } from './Icono';
import { Texto } from './Texto';
import { unir } from './unir';

/** Las unidades más comunes de la bitácora; cualquier otra se escribe (el dato sigue siendo un texto libre). */
export const UNIDADES_COMUNES = ['L', 'kg', 'g', 'mL', 'ramas', 'unidades'] as const;

export interface SelectorDeUnidadProps {
  readonly valor: string;
  readonly onChange: (unidad: string) => void;
}

function OpcionDeUnidad({
  unidad,
  activa,
  alElegir,
}: {
  unidad: string;
  activa: boolean;
  alElegir: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={unidad}
      accessibilityState={{ checked: activa }}
      onPress={alElegir}
      className={unir(
        'min-h-[48px] flex-row items-center gap-3 rounded-xl px-3 active:bg-surface-muted focus:bg-surface-muted',
        activa && 'bg-primary-soft',
      )}
    >
      <View className="w-6 items-center">
        {activa ? <Icono nombre="checkmark" tono="primary" /> : null}
      </View>
      <Texto variante="boton">{unidad}</Texto>
    </Pressable>
  );
}

/**
 * La unidad de la cantidad, a un toque de la cifra (D104): un botón con la unidad actual que abre una hoja con las
 * comunes y un campo para otra. Reemplaza al campo «Unidad» suelto, que repetía lo que ya se ve junto al número.
 */
export function SelectorDeUnidad({ valor, onChange }: SelectorDeUnidadProps) {
  const [abierta, setAbierta] = useState(false);
  const [otra, setOtra] = useState('');
  const elegir = (unidad: string) => {
    onChange(unidad);
    setAbierta(false);
    setOtra('');
  };
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unidad: ${valor}. Cambiar`}
        onPress={() => setAbierta(true)}
        className="min-h-[48px] min-w-[64px] flex-row items-center justify-center gap-1 rounded-xl border-2 border-border bg-surface px-3 focus:border-focus"
      >
        <Texto variante="boton">{valor}</Texto>
        <Icono nombre="chevron-down" tamano={16} tono="textMuted" />
      </Pressable>
      <HojaInferior visible={abierta} titulo="Unidad de medida" alCerrar={() => setAbierta(false)}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Unidad de medida">
          {UNIDADES_COMUNES.map((unidad) => (
            <OpcionDeUnidad
              key={unidad}
              unidad={unidad}
              activa={unidad === valor}
              alElegir={() => elegir(unidad)}
            />
          ))}
        </View>
        <CampoTexto etiqueta="Otra unidad" valor={otra} onChangeText={setOtra} maxLength={20} />
        <Boton
          titulo="Usar esta unidad"
          variante="tonal"
          deshabilitado={otra.trim() === ''}
          onPress={() => elegir(otra.trim())}
        />
      </HojaInferior>
    </>
  );
}
