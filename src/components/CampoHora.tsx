import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icono } from './Icono';
import { RelojPropio } from './RelojPropio';
import { Texto } from './Texto';
import { unir } from './unir';

export interface CampoHoraProps {
  readonly etiqueta: string;
  /** `HH:MM`, 24 horas. */
  readonly valor: string;
  readonly onChange: (hora: string) => void;
  readonly deshabilitado?: boolean;
}

/** Hora con el reloj digital propio de la app (D108): no se puede escribir una hora inexistente. */
export function CampoHora({ etiqueta, valor, onChange, deshabilitado = false }: CampoHoraProps) {
  const [abierto, setAbierto] = useState(false);

  return (
    <View className="gap-1">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${valor}. Cambiar`}
        accessibilityState={{ disabled: deshabilitado }}
        disabled={deshabilitado}
        onPress={() => setAbierto(true)}
        className={unir(
          'min-h-[48px] flex-row items-center gap-2 rounded-xl border-2 border-border bg-surface px-4 focus:border-focus',
          deshabilitado && 'opacity-50',
        )}
      >
        <Icono nombre="time-outline" tono="primary" />
        <Texto>{valor}</Texto>
      </Pressable>
      <RelojPropio
        key={String(abierto)}
        visible={abierto}
        titulo={etiqueta}
        valor={valor}
        alElegir={(hora) => {
          setAbierto(false);
          onChange(hora);
        }}
        alCerrar={() => setAbierto(false)}
      />
    </View>
  );
}
