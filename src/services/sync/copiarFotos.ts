import { guardarCopiaLocal, listarLaboresSinCopiaLocal } from '@/repositories/fotoRepository';
import type { Contexto } from '../contexto';

/** Cuántas fotos se bajan por vuelta: la primera sincronización con muchas fotos no se come los datos. */
const POR_VUELTA = 20;

/** La URL viene del servidor (dato, no orden): solo se baja lo que sea `https`. */
const esUrlSegura = (url: string): boolean => url.startsWith('https://');

/**
 * Baja las fotos de otros teléfonos a una copia local permanente, para verlas sin conexión (D97). Va DESPUÉS de
 * recibir los cambios y fuera de cualquier transacción: descargar tarda y no debe bloquear la base. Una foto que
 * no baja se salta (se reintenta en la próxima vuelta); lo demás sigue. Devuelve cuántas copió.
 */
export async function copiarFotosRemotas(ctx: Contexto): Promise<number> {
  let copiadas = 0;
  for (const labor of await listarLaboresSinCopiaLocal(ctx.db, POR_VUELTA)) {
    const url = labor.foto_url;
    if (url === null || !esUrlSegura(url)) continue;
    let uri: string;
    try {
      uri = await ctx.fotos.descargar(url, `remota-${labor.id}`);
    } catch {
      continue;
    }
    // Si la labor cambió mientras bajaba, esa copia ya no corresponde.
    if ((await guardarCopiaLocal(ctx.db, labor.id, url, uri)) === 0) await ctx.fotos.borrar(uri);
    else copiadas += 1;
  }
  return copiadas;
}
