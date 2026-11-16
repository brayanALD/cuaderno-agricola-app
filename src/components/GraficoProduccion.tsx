import { View } from 'react-native';
import { formatearCantidad } from '@/services/cantidad';
import { formatearMes } from '@/services/fechas';
import type { ProduccionMes } from '@/services/produccionService';
import { Texto } from './Texto';

/** Una barra con kg > 0 nunca se ve más delgada que esto: si no, un mes pequeño parecería vacío. */
const ANCHO_MINIMO_PCT = 4;

/** Ancho de la barra como porcentaje del mes mayor (0 si no hay nada que comparar). */
export function anchoDeBarra(kg: number, maximo: number): number {
  if (kg <= 0 || maximo <= 0) return 0;
  return Math.max(ANCHO_MINIMO_PCT, Math.round((kg / maximo) * 100));
}

/**
 * Producción por mes como barras (D101). Cada mes lleva su texto «mes: N kg» (la información nunca depende de la
 * barra ni del color) y la barra es solo apoyo visual: se oculta al lector de pantalla para no leerlo dos veces.
 */
export function GraficoProduccion({ meses }: { readonly meses: readonly ProduccionMes[] }) {
  const maximo = Math.max(0, ...meses.map((mes) => mes.kg));
  return (
    <View className="gap-3">
      {meses.map((mes) => (
        <View key={mes.mes} className="gap-1">
          <Texto variante="ayuda">
            {formatearMes(mes.mes)}: {formatearCantidad(mes.kg)} kg
          </Texto>
          <View
            testID={`barra-${mes.mes}`}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="h-3 overflow-hidden rounded-full bg-surface-muted"
          >
            <View
              className="h-3 rounded-full bg-success"
              style={{ width: `${String(anchoDeBarra(mes.kg, maximo))}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
