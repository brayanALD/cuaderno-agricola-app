import { guardarAjuste, leerAjuste } from '@/repositories/ajusteRepository';
import type { Contexto } from './contexto';

/** Consejo «mantén presionada una labor para duplicarla»: se muestra hasta que se cierra una vez (D105). */
export const CONSEJO_GESTOS = 'consejo.gestos.visto';

/** ¿Ya se vio y se cerró este consejo en este teléfono y esta cuenta? */
export async function consejoVisto(ctx: Contexto, clave: string): Promise<boolean> {
  return (await leerAjuste(ctx.db, clave)) === '1';
}

/** Da el consejo por visto: no vuelve a aparecer. */
export async function marcarConsejoVisto(ctx: Contexto, clave: string): Promise<void> {
  await guardarAjuste(ctx.db, clave, '1');
}
