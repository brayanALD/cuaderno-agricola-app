import type { LoteConDias } from '@/services/loteService';
import { useLotes } from './useLotes';

export interface VecinosDeLote {
  readonly anterior: LoteConDias | undefined;
  readonly siguiente: LoteConDias | undefined;
  /** «Lote 2 de 5», o vacío si el lote no está en la lista. */
  readonly posicion: string;
}

/** Lotes vecinos (por orden alfabético) para pasar de uno a otro deslizando o con botones. */
export function useVecinosDeLote(id: string): VecinosDeLote {
  const lotes = useLotes();
  const orden = lotes.vista.estado === 'listo' ? lotes.vista.datos : [];
  const indice = orden.findIndex((lote) => lote.id === id);
  return {
    anterior: indice > 0 ? orden[indice - 1] : undefined,
    siguiente: indice >= 0 ? orden[indice + 1] : undefined,
    posicion: indice >= 0 ? `Lote ${indice + 1} de ${orden.length}` : '',
  };
}
