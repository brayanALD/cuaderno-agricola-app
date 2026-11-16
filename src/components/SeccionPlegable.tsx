import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icono } from './Icono';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

export interface SeccionPlegableProps {
  readonly titulo: string;
  /** Qué hay dentro, para decidir si abrirla («Luz y costo»). */
  readonly resumen: string;
  /** Abierta desde el principio (p. ej. al editar algo que ya tiene esos datos). */
  readonly abiertaAlInicio?: boolean;
  readonly children: ReactNode;
}

/**
 * Lo opcional, plegado (Hick, D104): el formulario muestra primero lo que casi siempre se llena. El encabezado
 * entero es el botón (56 dp) y TalkBack dice si está abierto.
 */
export function SeccionPlegable({
  titulo,
  resumen,
  abiertaAlInicio = false,
  children,
}: SeccionPlegableProps) {
  const [abierta, setAbierta] = useState(abiertaAlInicio);
  return (
    <Tarjeta className="gap-0 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${titulo}, ${resumen}`}
        accessibilityState={{ expanded: abierta }}
        onPress={() => setAbierta((antes) => !antes)}
        className="min-h-[56px] flex-row items-center gap-2 focus:border-focus"
      >
        <View className="flex-1">
          <Texto variante="etiqueta">{titulo}</Texto>
          <Texto variante="ayuda">{resumen}</Texto>
        </View>
        <Icono nombre={abierta ? 'chevron-up' : 'chevron-down'} tono="textMuted" />
      </Pressable>
      {abierta ? <View className="gap-4 pb-3 pt-1">{children}</View> : null}
    </Tarjeta>
  );
}
