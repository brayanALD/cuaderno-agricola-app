import { useConsejo } from '@/hooks/useConsejo';
import { CONSEJO_GESTOS } from '@/services/ajustesService';
import { Banner } from './Banner';

/**
 * El gesto de mantener presionado una labor para duplicarla se descubre una sola vez (D105): un aviso que se
 * cierra con «Entendido» y no vuelve. Duplicar tiene siempre su opción visible en el menú ⋮ de la fila.
 */
export function ConsejoDeGestos() {
  const { visible, descartar } = useConsejo(CONSEJO_GESTOS);
  if (!visible) return null;
  return (
    <Banner
      icono="information-circle-outline"
      texto="Mantén presionada una labor para duplicarla con la fecha de hoy."
      accion={{ titulo: 'Entendido', alPulsar: descartar }}
    />
  );
}
