import { View } from 'react-native';
import { useResumen } from '@/hooks/useLabores';
import { formatearCantidad } from '@/services/cantidad';
import { formatearMes } from '@/services/fechas';
import { Tarjeta, type TonoTarjeta } from './Tarjeta';
import { Texto } from './Texto';

interface DatoProps {
  readonly valor: string;
  /** Lo que se ve debajo de la cifra: corto. */
  readonly etiqueta: string;
  /** Lo que lee el lector de pantalla; por defecto «etiqueta: valor». */
  readonly descripcion?: string;
  readonly tono?: TonoTarjeta;
}

/** Una cifra de la finca: grande arriba, qué es debajo. Una sola unidad para el lector de pantalla. */
function Dato({ valor, etiqueta, descripcion, tono }: DatoProps) {
  return (
    <Tarjeta tono={tono} className="min-w-[96px] flex-1 gap-1 p-3">
      <View accessible accessibilityLabel={descripcion ?? `${etiqueta}: ${valor}`}>
        <Texto variante="metrica">{valor}</Texto>
        <Texto variante="ayuda">{etiqueta}</Texto>
      </View>
    </Tarjeta>
  );
}

/**
 * Resumen de toda la finca (D100): lotes, labores que tocan hoy o ya vencieron y lo cosechado este mes. Sin
 * título (D104: la pestaña ya dice dónde estás). Con labores de hoy o vencidas la tarjeta pasa a dorado suave. Los
 * cambios sin enviar los dice `AvisoDePendientes`. Sin lotes, cargando o con error no pinta nada: la lista de
 * debajo ya maneja esos estados y explica qué hacer.
 */
export function PanelResumen() {
  const { vista } = useResumen();
  if (vista.estado !== 'listo') return null;
  const datos = vista.datos;
  const pendientes = datos.vencidas;
  return (
    <View className="mb-3 flex-row flex-wrap gap-2">
      <Dato valor={String(datos.lotes)} etiqueta={datos.lotes === 1 ? 'Lote' : 'Lotes'} />
      <Dato
        valor={String(pendientes)}
        etiqueta="Hoy o vencidas"
        descripcion={`${pendientes === 1 ? 'Labor toca hoy o venció' : 'Labores tocan hoy o vencieron'}: ${String(pendientes)}`}
        tono={pendientes > 0 ? 'aviso' : 'normal'}
      />
      <Dato
        valor={`${formatearCantidad(datos.kgDelMes)} kg`}
        etiqueta="Cosecha del mes"
        descripcion={`Cosechado en ${formatearMes(datos.mes)}: ${formatearCantidad(datos.kgDelMes)} kg`}
      />
    </View>
  );
}
