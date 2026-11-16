import { useMemo } from 'react';
import type { CicloFila, LaborFila, LoteFila } from '@/db/modelo';
import { useCuaderno } from '@/context/CuadernoContext';
import { cerrarCiclo } from '@/services/cicloService';
import { actualizarLabor, borrarLabor, crearLabor, duplicarLabor } from '@/services/laborService';
import { actualizarLote, borrarLote, crearLote } from '@/services/loteService';
import type { Resultado } from '@/services/resultado';

export interface Acciones {
  crearLote(datos: unknown): Promise<Resultado<LoteFila>>;
  actualizarLote(id: string, datos: unknown): Promise<Resultado<LoteFila>>;
  borrarLote(id: string): Promise<boolean>;
  crearLabor(loteId: string, datos: unknown): Promise<Resultado<LaborFila>>;
  actualizarLabor(id: string, datos: unknown): Promise<Resultado<LaborFila>>;
  duplicarLabor(id: string): Promise<Resultado<LaborFila>>;
  borrarLabor(id: string): Promise<boolean>;
  cerrarCiclo(loteId: string, datos: unknown): Promise<Resultado<CicloFila>>;
}

const salioBien = (resultado: Resultado<unknown> | boolean): boolean =>
  typeof resultado === 'boolean' ? resultado : resultado.ok;

/**
 * Escrituras de la UI. Cada una avisa con `invalidar()` solo si salió bien, y así las lecturas
 * activas se recargan. Los errores de validación se devuelven (no se lanzan) para los formularios.
 */
export function useAcciones(): Acciones {
  const { ctx, invalidar } = useCuaderno();
  return useMemo(() => {
    const tras = async <T extends Resultado<unknown> | boolean>(
      operacion: Promise<T>,
    ): Promise<T> => {
      const resultado = await operacion;
      if (salioBien(resultado)) invalidar();
      return resultado;
    };
    return {
      crearLote: (datos) => tras(crearLote(ctx, datos)),
      actualizarLote: (id, datos) => tras(actualizarLote(ctx, id, datos)),
      borrarLote: (id) => tras(borrarLote(ctx, id)),
      crearLabor: (loteId, datos) => tras(crearLabor(ctx, loteId, datos)),
      actualizarLabor: (id, datos) => tras(actualizarLabor(ctx, id, datos)),
      duplicarLabor: (id) => tras(duplicarLabor(ctx, id)),
      borrarLabor: (id) => tras(borrarLabor(ctx, id)),
      cerrarCiclo: (loteId, datos) => tras(cerrarCiclo(ctx, loteId, datos)),
    };
  }, [ctx, invalidar]);
}
