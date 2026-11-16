import { contarSync, type ConteoSync } from '@/repositories/estadoSyncRepository';
import type { Contexto } from '@/services/contexto';
import { useCarga, type Carga } from './useCarga';

const cargarConteo = (ctx: Contexto): Promise<ConteoSync> => contarSync(ctx.db);

/**
 * Cuántos cambios faltan enviar y cuántos tienen aviso (D99). Se relee tras cada escritura y tras cada vuelta de
 * sincronización que mueva algo, así que no depende del proveedor de sincronización.
 */
export function usePendientes(): Carga<ConteoSync> {
  return useCarga(cargarConteo);
}
