import { View } from 'react-native';
import type { TipoLabor } from '@/db/modelo';
import { ConsejoDeGestos } from './ConsejoDeGestos';
import { FiltroPorTipo } from './FiltroPorTipo';
import { Texto } from './Texto';

export interface EncabezadoDeBitacoraProps {
  /** Cuántas labores tiene el lote (sin filtrar). Con 0 no hay nada que filtrar ni que aconsejar. */
  readonly total: number;
  readonly tipo: TipoLabor | null;
  readonly alElegir: (tipo: TipoLabor | null) => void;
}

/**
 * Título de la bitácora, filtro por tipo (chips de 48 dp que se desplazan de lado) y el consejo de gestos de
 * una sola vez (D104, D105).
 */
export function EncabezadoDeBitacora({ total, tipo, alElegir }: EncabezadoDeBitacoraProps) {
  return (
    <View className="mt-4 gap-3">
      <View className="flex-row items-center justify-between">
        <Texto variante="subtitulo">Bitácora de labores</Texto>
        {total === 0 ? null : (
          <Texto tono="tenue">{total === 1 ? '1 labor' : `${String(total)} labores`}</Texto>
        )}
      </View>
      {total === 0 ? null : (
        <>
          <FiltroPorTipo tipo={tipo} alElegir={alElegir} />
          <ConsejoDeGestos />
        </>
      )}
    </View>
  );
}
