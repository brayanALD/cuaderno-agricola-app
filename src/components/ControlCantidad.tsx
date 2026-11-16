import type { ReactNode } from 'react';
import { View } from 'react-native';
import { BotonIcono } from './BotonIcono';
import { CajaCantidad } from './CajaCantidad';
import { MensajeError } from './MensajeError';
import { Texto } from './Texto';
import { useControlCantidad } from './useControlCantidad';

export { PX_POR_PASO } from './useGestoCantidad';

export interface ControlCantidadProps {
  readonly etiqueta: string;
  readonly valor: number;
  readonly onChange: (cantidad: number) => void;
  readonly paso?: number;
  readonly unidad?: string;
  readonly max?: number;
  readonly error?: string;
  /** Un control más junto a la cifra (p. ej. el selector de unidad). */
  readonly extra?: ReactNode;
}

/**
 * Cantidad ≥ 0 con un control propio (gesto de arrastre vertical de la sección 4, que se descubre por el icono de la
 * caja). La alternativa accesible son los botones «−» y «+»; el número también se puede escribir.
 */
export function ControlCantidad({
  etiqueta,
  valor,
  onChange,
  paso = 1,
  unidad,
  max,
  error,
  extra,
}: ControlCantidadProps) {
  const { texto, gesto, escribir, cambiar, alSalir } = useControlCantidad({
    valor,
    onChange,
    paso,
    max,
  });
  const nombre = etiqueta.toLowerCase();
  return (
    <View className="gap-1">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <View className="flex-row items-center gap-2">
        <BotonIcono
          icono="remove"
          etiqueta={`Disminuir ${nombre}`}
          onPress={() => cambiar(-1)}
          deshabilitado={valor <= 0}
        />
        <CajaCantidad
          etiqueta={etiqueta}
          texto={texto}
          unidad={unidad}
          gesto={gesto}
          onChangeText={escribir}
          onBlur={alSalir}
        />
        {extra}
        <BotonIcono
          icono="add"
          etiqueta={`Aumentar ${nombre}`}
          onPress={() => cambiar(1)}
          deshabilitado={max !== undefined && valor >= max}
        />
      </View>
      <MensajeError texto={error} />
    </View>
  );
}
