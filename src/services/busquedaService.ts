import type { LaborFila, LoteFila } from '@/db/modelo';
import { buscarLabores } from '@/repositories/laborRepository';
import { listarLotes } from '@/repositories/loteRepository';
import type { Contexto } from './contexto';

export interface ResultadoBusqueda {
  readonly lotes: LoteFila[];
  readonly labores: LaborFila[];
}

/** Solo las labores que contienen el texto en su tipo o su nota (pestaña «Labores»). */
export async function buscarSoloLabores(ctx: Contexto, texto: string): Promise<LaborFila[]> {
  return texto.trim() === '' ? [] : buscarLabores(ctx.db, texto);
}

/** D39: `LIKE` en lotes (nombre, cultivo) y labores (tipo, nota). Un texto en blanco no busca nada. */
export async function buscarEnCuaderno(ctx: Contexto, texto: string): Promise<ResultadoBusqueda> {
  if (texto.trim() === '') return { lotes: [], labores: [] };
  const [lotes, labores] = await Promise.all([
    listarLotes(ctx.db, texto),
    buscarLabores(ctx.db, texto),
  ]);
  return { lotes, labores };
}
