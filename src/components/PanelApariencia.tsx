import { useApariencia } from '@/theme/AparienciaProvider';
import type { Apariencia } from '@/theme/apariencia';
import { Selector, type OpcionSelector } from './Selector';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

const OPCIONES: readonly OpcionSelector<Apariencia>[] = [
  { valor: 'sistema', etiqueta: 'Sistema' },
  { valor: 'claro', etiqueta: 'Claro' },
  { valor: 'oscuro', etiqueta: 'Oscuro' },
];

/**
 * Modo de visualización (D105). «Sistema» sigue al teléfono (lo de siempre); «Claro» y «Oscuro» lo fijan, útil al
 * aire libre si el modo del teléfono no se lee bien con el brillo del campo.
 */
export function PanelApariencia() {
  const { apariencia, cambiar } = useApariencia();
  return (
    <Tarjeta>
      <Texto variante="subtitulo">Apariencia</Texto>
      <Selector
        etiqueta="Modo de visualización"
        opciones={OPCIONES}
        valor={apariencia}
        onChange={(elegida) => {
          if (elegida !== null) cambiar(elegida);
        }}
        igual
      />
      <Texto variante="ayuda">
        «Sistema» sigue el modo del teléfono. Elige el que mejor se lea al aire libre.
      </Texto>
    </Tarjeta>
  );
}
