import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { esFechaValida, formatearFecha, sumarDias } from '@/services/fechas';
import { CalendarioPropio } from './CalendarioPropio';
import { Icono } from './Icono';
import { MensajeError } from './MensajeError';
import { Texto } from './Texto';
import { unir } from './unir';

export interface FechaRapidaProps {
  readonly etiqueta: string;
  /** `AAAA-MM-DD`, o vacío si todavía no hay fecha. */
  readonly valor: string;
  readonly onChange: (fecha: string) => void;
  /** Hoy en `AAAA-MM-DD`: «Hoy» la elige y «Ayer» es el día anterior. */
  readonly hoy: string;
  /** Última fecha elegible (p. ej. hoy, para labores realizadas). */
  readonly maxima?: string;
  readonly error?: string;
}

function Opcion({
  titulo,
  activa,
  alPulsar,
  icono,
}: {
  titulo: string;
  activa: boolean;
  alPulsar: () => void;
  icono?: 'calendar-outline';
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={titulo}
      accessibilityState={{ checked: activa }}
      onPress={alPulsar}
      className={unir(
        'min-h-[48px] flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border-2 px-2 focus:border-focus',
        activa
          ? 'border-primary bg-primary-soft'
          : 'border-border bg-surface active:bg-surface-muted',
      )}
    >
      {activa ? <Icono nombre="checkmark" tamano={16} tono="primary" /> : null}
      {!activa && icono ? <Icono nombre={icono} tamano={16} tono="textMuted" /> : null}
      <Texto variante="boton">{titulo}</Texto>
    </Pressable>
  );
}

/**
 * Fecha en un toque (D104, Tesler): «Hoy», «Ayer» u «Otra fecha» (el calendario propio, D108, que no deja
 * escribir una fecha inexistente). Debajo siempre se lee la fecha completa elegida.
 */
export function FechaRapida({ etiqueta, valor, onChange, hoy, maxima, error }: FechaRapidaProps) {
  const hayFecha = esFechaValida(valor);
  const ayer = sumarDias(hoy, -1);

  const [abierto, setAbierto] = useState(false);

  return (
    <View className="gap-1">
      <Texto variante="etiqueta">{etiqueta}</Texto>
      <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} className="flex-row gap-2">
        <Opcion titulo="Hoy" activa={valor === hoy} alPulsar={() => onChange(hoy)} />
        <Opcion titulo="Ayer" activa={valor === ayer} alPulsar={() => onChange(ayer)} />
        <Opcion
          titulo="Otra fecha"
          icono="calendar-outline"
          activa={hayFecha && valor !== hoy && valor !== ayer}
          alPulsar={() => setAbierto(true)}
        />
      </View>
      <CalendarioPropio
        key={String(abierto)}
        visible={abierto}
        titulo={etiqueta}
        valor={valor}
        hoy={hoy}
        maxima={maxima}
        alElegir={(fecha) => {
          setAbierto(false);
          onChange(fecha);
        }}
        alCerrar={() => setAbierto(false)}
      />
      <Texto variante="ayuda">{hayFecha ? formatearFecha(valor) : 'Sin fecha'}</Texto>
      <MensajeError texto={error} />
    </View>
  );
}
