import {
  conservarLaMia,
  leerConflicto,
  type TablaVersionada,
} from '@/repositories/conflictoRepository';
import { leerFotoUri } from '@/repositories/fotoRepository';
import { guardarLaborRemota } from '@/repositories/laborRepository';
import { guardarLoteRemoto } from '@/repositories/loteRepository';
import type { Contexto } from './contexto';
import { VERSION_DESCONOCIDA } from './sync/conflictos';
import { laborRemotaSchema, loteRemotoSchema } from './sync/esquemasRemotos';

export type Eleccion = 'mia' | 'servidor';
export type EntidadConConflicto = 'lote' | 'labor';

/** El texto guardado como JSON; si no se puede leer devuelve `undefined`, que ningún esquema acepta. */
function comoJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return undefined;
  }
}

/** Quedarse con lo de este teléfono: parte de la versión que tiene el servidor y se enviará en la próxima vuelta. */
const quedarmeConLaMia = async (
  ctx: Contexto,
  tabla: TablaVersionada,
  id: string,
  version: string,
): Promise<boolean> => (await conservarLaMia(ctx.db, tabla, id, version, ctx.ahora())) > 0;

/**
 * El usuario elige qué versión conservar de un lote o una labor en conflicto (D96): `mia` (se enviará y pisará
 * la del otro teléfono) o `servidor` (se descartan los cambios locales). Devuelve `false` si ya no había nada que
 * decidir. Si el documento guardado no se puede leer, se desbloquea la fila con la regla de siempre (gana la
 * última escritura) en vez de dejarla atascada.
 */
export async function resolverConflicto(
  ctx: Contexto,
  entidad: EntidadConConflicto,
  id: string,
  eleccion: Eleccion,
): Promise<boolean> {
  const texto = await leerConflicto(ctx.db, entidad, id);
  if (texto === null) return false;
  const guardado = comoJson(texto);
  if (entidad === 'lote') {
    const remoto = loteRemotoSchema.safeParse(guardado);
    if (!remoto.success) return quedarmeConLaMia(ctx, 'lote', id, VERSION_DESCONOCIDA);
    if (eleccion === 'mia') return quedarmeConLaMia(ctx, 'lote', id, remoto.data.updated_at);
    return (await guardarLoteRemoto(ctx.db, remoto.data, true)) > 0;
  }
  const remota = laborRemotaSchema.safeParse(guardado);
  if (!remota.success) return quedarmeConLaMia(ctx, 'labor', id, VERSION_DESCONOCIDA);
  if (eleccion === 'mia') return quedarmeConLaMia(ctx, 'labor', id, remota.data.updated_at);
  const copia = await leerFotoUri(ctx.db, id);
  const aplicada = (await guardarLaborRemota(ctx.db, remota.data, true)) > 0;
  if (aplicada && copia !== null) await ctx.fotos.borrar(copia);
  return aplicada;
}
