import type { TipoLabor } from '@/db/modelo';
import type { NombreIcono } from './Icono';

/** El icono de cada tipo de labor: el mismo en la bitácora, las franjas, el selector y los avisos. */
export const ICONO_TIPO: Readonly<Record<TipoLabor, NombreIcono>> = {
  riego: 'water-outline',
  abono: 'flask-outline',
  fumigacion: 'color-wand-outline',
  poda: 'cut-outline',
  cosecha: 'basket-outline',
};
