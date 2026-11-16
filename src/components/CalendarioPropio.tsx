import { useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  esFechaValida,
  formatearFecha,
  formatearMes,
  semanasDelMes,
  sumarMeses,
} from '@/services/fechas';
import { Boton } from './Boton';
import { BotonIcono } from './BotonIcono';
import { HojaInferior } from './HojaInferior';
import { Texto } from './Texto';
import { unir } from './unir';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
const NOMBRE_DIA = [
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
  'domingo',
] as const;

export interface CalendarioPropioProps {
  readonly visible: boolean;
  readonly titulo: string;
  /** Fecha elegida `AAAA-MM-DD` (o vacío). */
  readonly valor: string;
  /** Hoy, `AAAA-MM-DD`: se marca y el calendario abre en su mes si no hay fecha. */
  readonly hoy: string;
  /** Última fecha elegible; los días posteriores no se pueden tocar. */
  readonly maxima?: string;
  readonly alElegir: (fecha: string) => void;
  readonly alCerrar: () => void;
}

interface DiaProps {
  readonly fecha: string;
  readonly elegido: boolean;
  readonly esHoy: boolean;
  readonly bloqueado: boolean;
  readonly alElegir: (fecha: string) => void;
}

/** Un día de 48 dp: el elegido lleva relleno verde; hoy, borde; los bloqueados se ven apagados y no responden. */
function Dia({ fecha, elegido, esHoy, bloqueado, alElegir }: DiaProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={formatearFecha(fecha)}
      accessibilityState={{ selected: elegido, disabled: bloqueado }}
      disabled={bloqueado}
      onPress={() => alElegir(fecha)}
      className={unir(
        'h-12 flex-1 items-center justify-center rounded-full border-2 focus:border-focus',
        elegido ? 'border-primary bg-primary' : esHoy ? 'border-primary' : 'border-transparent',
        bloqueado && 'opacity-40',
      )}
    >
      <Texto variante="boton" tono={elegido ? 'sobrePrimario' : 'texto'}>
        {String(Number(fecha.slice(8)))}
      </Texto>
    </Pressable>
  );
}

/** Mes y flechas: no se puede pasar a un mes entero posterior a la fecha máxima. */
function EncabezadoDeMes({
  mes,
  puedeAvanzar,
  alMover,
}: {
  mes: string;
  puedeAvanzar: boolean;
  alMover: (n: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <BotonIcono icono="chevron-back" etiqueta="Mes anterior" onPress={() => alMover(-1)} />
      <Texto variante="subtitulo" accessibilityLiveRegion="polite">
        {formatearMes(mes)}
      </Texto>
      <BotonIcono
        icono="chevron-forward"
        etiqueta="Mes siguiente"
        deshabilitado={!puedeAvanzar}
        onPress={() => alMover(1)}
      />
    </View>
  );
}

/**
 * Calendario propio con la identidad de la app (D108): en una hoja, con el mes en grande, días de 48 dp y la
 * semana desde el lunes. Tocar un día lo elige y cierra. Reemplaza al calendario genérico de Android.
 */
export function CalendarioPropio({
  visible,
  titulo,
  valor,
  hoy,
  maxima,
  alElegir,
  alCerrar,
}: CalendarioPropioProps) {
  const [mes, setMes] = useState((esFechaValida(valor) ? valor : hoy).slice(0, 7));
  const tope = (maxima ?? '9999-12-31').slice(0, 7);
  return (
    <HojaInferior visible={visible} titulo={titulo} alCerrar={alCerrar}>
      <EncabezadoDeMes
        mes={mes}
        puedeAvanzar={mes < tope}
        alMover={(n) => setMes(sumarMeses(mes, n))}
      />
      <View className="flex-row" accessible={false} importantForAccessibility="no-hide-descendants">
        {DIAS_SEMANA.map((letra, i) => (
          <Texto key={NOMBRE_DIA[i]} variante="ayuda" className="flex-1 text-center">
            {letra}
          </Texto>
        ))}
      </View>
      {semanasDelMes(mes).map((semana) => (
        <View key={semana.find((d) => d !== null) ?? mes} className="flex-row">
          {semana.map((fecha, i) =>
            fecha === null ? (
              <View key={`hueco-${NOMBRE_DIA[i] ?? ''}`} className="h-12 flex-1" />
            ) : (
              <Dia
                key={fecha}
                fecha={fecha}
                elegido={fecha === valor}
                esHoy={fecha === hoy}
                bloqueado={maxima !== undefined && fecha > maxima}
                alElegir={alElegir}
              />
            ),
          )}
        </View>
      ))}
      <Boton titulo="Cancelar" variante="texto" onPress={alCerrar} />
    </HojaInferior>
  );
}
