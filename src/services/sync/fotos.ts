import { z } from 'zod';
import { ErrorApi } from '@/api/errores';
import {
  encolarBorradoDeFoto,
  listarFotosPorBorrar,
  quitarFotoPorBorrar,
} from '@/repositories/fotoRepository';
import {
  guardarFotoUrl,
  listarLaboresConFotoPorSubir,
  marcarLaborConError,
} from '@/repositories/laborRepository';
import type { LaborFila } from '@/db/modelo';
import type { Contexto } from '../contexto';
import { mensajeDeFila } from './errores';
import type { ResumenEnvio } from './enviar';
import type { ClienteSync } from './tipos';

const respuestaSubida = z.object({ url: z.string().startsWith('https://'), pathname: z.string() });

const MENSAJE_FOTO_PERDIDA =
  'La foto ya no está en este teléfono. Quítala o elige otra para sincronizar esta labor.';
const MENSAJE_FOTO_GRANDE = 'La foto pesa demasiado para subirla (máximo ~4 MB). Elige otra.';
const MENSAJE_FOTO_FORMATO = 'El formato de la foto no es válido. Elige otra.';

/** Aviso de una labor cuya foto no se pudo subir; lo que no es de esa foto (sin red, sesión…) se relanza. */
function mensajeDeFoto(error: unknown): string {
  if (error instanceof ErrorApi && error.status === 413) return MENSAJE_FOTO_GRANDE;
  if (error instanceof ErrorApi && error.status === 415) return MENSAJE_FOTO_FORMATO;
  return mensajeDeFila(error, 'labor');
}

type Resultado = 'subida' | 'aviso';

async function subirUna(ctx: Contexto, cliente: ClienteSync, labor: LaborFila): Promise<Resultado> {
  if (labor.foto_uri === null) return 'aviso';
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = await ctx.fotos.leer(labor.foto_uri);
  } catch {
    await marcarLaborConError(ctx.db, labor.id, labor.updated_at, MENSAJE_FOTO_PERDIDA);
    return 'aviso';
  }
  try {
    const cuerpo = await cliente.pedir('/api/imagenes', {
      metodo: 'POST',
      binario: { bytes, tipo: 'image/jpeg' },
    });
    const subida = respuestaSubida.safeParse(cuerpo);
    if (!subida.success) throw new ErrorApi(502, 'Respuesta inesperada del servidor.');
    // Si la labor cambió mientras subía, esa imagen ya no corresponde: se descarta y se vuelve a subir.
    const guardada = await guardarFotoUrl(ctx.db, labor.id, labor.updated_at, subida.data.url);
    if (guardada === 0) await encolarBorradoDeFoto(ctx.db, subida.data.url);
    return 'subida';
  } catch (error) {
    await marcarLaborConError(ctx.db, labor.id, labor.updated_at, mensajeDeFoto(error));
    return 'aviso';
  }
}

/**
 * Sube las fotos de las labores pendientes (D83, D84) ANTES de enviar las labores: así cada labor lleva la
 * URL de su foto. Una foto que falla deja con aviso SOLO a su labor; sin red, sesión o servidor corta la vuelta.
 */
export async function subirFotos(ctx: Contexto, cliente: ClienteSync): Promise<ResumenEnvio> {
  let enviados = 0;
  let avisos = 0;
  for (const labor of await listarLaboresConFotoPorSubir(ctx.db)) {
    if ((await subirUna(ctx, cliente, labor)) === 'subida') enviados += 1;
    else avisos += 1;
  }
  return { enviados, avisos };
}

/** Un 400, 403 o 404 al borrar significa que la imagen ya no es nuestra o no existe: sale de la cola. */
const yaNoHayQueBorrar = (error: unknown): boolean =>
  error instanceof ErrorApi && [400, 403, 404].includes(error.status);

/** Borra del servidor las imágenes que dejaron de usarse (D85). Lo que falla por red se queda en la cola. */
export async function borrarFotosPorBorrar(ctx: Contexto, cliente: ClienteSync): Promise<void> {
  for (const url of await listarFotosPorBorrar(ctx.db)) {
    try {
      await cliente.pedir(`/api/imagenes?url=${encodeURIComponent(url)}`, { metodo: 'DELETE' });
    } catch (error) {
      if (!yaNoHayQueBorrar(error)) throw error;
    }
    await quitarFotoPorBorrar(ctx.db, url);
  }
}
