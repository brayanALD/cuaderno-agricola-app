import type { LaborFila } from '@/db/modelo';
import { useBusquedaDeLabores, useLaboresRecientes } from './useLabores';
import { useLotes } from './useLotes';
import type { Carga } from './useCarga';

export interface LaboresVisibles {
  readonly buscando: boolean;
  /** Búsqueda si hay texto; si no, las más recientes. */
  readonly carga: Carga<LaborFila[]>;
  readonly datos: readonly LaborFila[];
  /** Nombre de cada lote, para mostrarlo junto a la labor. */
  readonly nombres: ReadonlyMap<string, string>;
}

/** Datos de la pestaña «Labores»: lo que se ve según haya o no texto de búsqueda. */
export function useLaboresVisibles(texto: string): LaboresVisibles {
  const buscando = texto.trim() !== '';
  const recientes = useLaboresRecientes(30);
  const busqueda = useBusquedaDeLabores(texto);
  const lotes = useLotes();

  const carga = buscando ? busqueda : recientes;
  const datos = carga.vista.estado === 'listo' ? carga.vista.datos : [];
  const nombres = new Map(
    lotes.vista.estado === 'listo'
      ? lotes.vista.datos.map((lote) => [lote.id, lote.nombre] as const)
      : [],
  );
  return { buscando, carga, datos, nombres };
}
