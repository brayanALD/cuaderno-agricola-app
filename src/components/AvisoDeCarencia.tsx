import { Banner } from './Banner';

/**
 * Advertencia de periodo de carencia (D95): dorado suave con icono y texto (no depende solo del color), se anuncia
 * al aparecer y NO bloquea nada (D104: antes parecía un error con su icono rojo).
 */
export function AvisoDeCarencia({ texto }: { readonly texto: string }) {
  return <Banner tono="aviso" icono="warning-outline" texto={texto} />;
}
