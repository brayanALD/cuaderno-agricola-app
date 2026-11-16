import { View } from 'react-native';
import { formatearCantidad } from '@/services/cantidad';
import { formatearMes, mesCorto } from '@/services/fechas';
import type { ProduccionMes } from '@/services/produccionService';
import { Texto } from './Texto';

/** Alto de la barra del mes mayor, en dp. */
const ALTO_MAXIMO = 120;
/** Una barra con kg > 0 nunca se ve más baja que esto: si no, un mes pequeño parecería vacío. */
const ALTO_MINIMO = 6;

/** Alto de la barra en dp, proporcional al mes mayor (0 si no hay nada que comparar). */
export function alturaDeBarra(kg: number, maximo: number): number {
  if (kg <= 0 || maximo <= 0) return 0;
  return Math.max(ALTO_MINIMO, Math.round((kg / maximo) * ALTO_MAXIMO));
}

interface GraficoProps {
  readonly meses: readonly ProduccionMes[];
  /** `AAAA-MM` del mes en curso: se marca en el eje. */
  readonly mesActual?: string;
}

/**
 * Producción por mes como columnas (D101, D104). El valor va escrito sobre cada columna y el mes debajo: la
 * información nunca depende de la barra ni del color. Cada columna es UN elemento para el lector de pantalla
 * («octubre de 2026: 12,5 kg»); la barra es solo apoyo visual y se oculta.
 */
export function GraficoProduccion({ meses, mesActual }: GraficoProps) {
  const maximo = Math.max(0, ...meses.map((mes) => mes.kg));
  return (
    <View>
      <View className="h-[170px] flex-row items-end gap-4 border-b-2 border-border px-2">
        {meses.map((mes) => (
          <View
            key={mes.mes}
            accessible
            accessibilityLabel={`${formatearMes(mes.mes)}: ${formatearCantidad(mes.kg)} kg`}
            className="flex-1 items-center justify-end gap-1"
          >
            <Texto variante="etiqueta">{formatearCantidad(mes.kg)} kg</Texto>
            <View
              testID={`barra-${mes.mes}`}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="w-full rounded-t-lg bg-primary"
              style={{ height: alturaDeBarra(mes.kg, maximo) }}
            />
          </View>
        ))}
      </View>
      <View className="flex-row gap-4 px-2 pt-1.5">
        {meses.map((mes) => (
          <Texto
            key={mes.mes}
            variante={mes.mes === mesActual ? 'etiqueta' : 'ayuda'}
            className="flex-1 text-center"
          >
            {mes.mes === mesActual ? `${mesCorto(mes.mes)} · en curso` : mesCorto(mes.mes)}
          </Texto>
        ))}
      </View>
    </View>
  );
}
