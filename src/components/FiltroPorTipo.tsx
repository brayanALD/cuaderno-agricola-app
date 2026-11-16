import { ScrollView } from 'react-native';
import { TIPOS_LABOR, type TipoLabor } from '@/db/modelo';
import { ETIQUETA_TIPO } from '@/services/etiquetas';
import { Chip } from './Chip';
import { ICONO_TIPO } from './iconosDeLabor';

export interface FiltroPorTipoProps {
  /** `null` = todas. */
  readonly tipo: TipoLabor | null;
  readonly alElegir: (tipo: TipoLabor | null) => void;
}

/** Filtro por tipo de labor: «Todas» y un chip por tipo (48 dp), que se desplazan de lado si no caben. */
export function FiltroPorTipo({ tipo, alElegir }: FiltroPorTipoProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="-mx-4"
      contentContainerClassName="gap-2 px-4"
    >
      <Chip titulo="Todas" activo={tipo === null} onPress={() => alElegir(null)} />
      {TIPOS_LABOR.map((posible) => (
        <Chip
          key={posible}
          titulo={ETIQUETA_TIPO[posible]}
          icono={ICONO_TIPO[posible]}
          activo={tipo === posible}
          onPress={() => alElegir(posible)}
        />
      ))}
    </ScrollView>
  );
}
