import { View } from 'react-native';
import { useResumen } from '@/hooks/useLabores';
import { formatearCantidad } from '@/services/cantidad';
import { formatearMes } from '@/services/fechas';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

function Dato({ valor, etiqueta }: { readonly valor: string; readonly etiqueta: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${etiqueta}: ${valor}`}
      className="min-w-[96px] flex-1 gap-1"
    >
      <Texto variante="titulo">{valor}</Texto>
      <Texto variante="ayuda">{etiqueta}</Texto>
    </View>
  );
}

/**
 * Resumen de toda la finca (D100): lotes, labores que tocan hoy o ya vencieron y lo cosechado este mes. Los
 * cambios sin enviar los dice `AvisoDePendientes`. Sin lotes, cargando o con error no pinta nada: la lista de
 * debajo ya maneja esos estados y explica qué hacer.
 */
export function PanelResumen() {
  const { vista } = useResumen();
  if (vista.estado !== 'listo') return null;
  const datos = vista.datos;
  return (
    <Tarjeta className="mb-3">
      <Texto variante="subtitulo">Resumen</Texto>
      <View className="flex-row flex-wrap gap-4">
        <Dato valor={String(datos.lotes)} etiqueta={datos.lotes === 1 ? 'Lote' : 'Lotes'} />
        <Dato
          valor={String(datos.vencidas)}
          etiqueta={
            datos.vencidas === 1 ? 'Labor toca hoy o venció' : 'Labores tocan hoy o vencieron'
          }
        />
        <Dato
          valor={`${formatearCantidad(datos.kgDelMes)} kg`}
          etiqueta={`Cosechado en ${formatearMes(datos.mes)}`}
        />
      </View>
    </Tarjeta>
  );
}
