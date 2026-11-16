import type { LoteFila } from '@/db/modelo';
import { marcarCiclosDeLoteBorrados } from '@/repositories/cicloRepository';
import { encolarFotosDeLote } from '@/repositories/fotoRepository';
import { listarLaboresDeLote, marcarLaboresDeLoteBorradas } from '@/repositories/laborRepository';
import {
  actualizarLote as actualizarFila,
  existeNombreLote,
  insertarLote,
  listarLotes,
  marcarLoteBorrado,
  obtenerLote as obtenerFila,
} from '@/repositories/loteRepository';
import type { Contexto } from './contexto';
import { diasDesdeSiembra } from './fechas';
import { erroresDeZod, exito, fallo, type Resultado } from './resultado';
import { loteSchema, type DatosLote } from './validacion';

export interface LoteConDias extends LoteFila {
  readonly dias_desde_siembra: number;
}

const NOMBRE_REPETIDO = 'Ya existe un lote con ese nombre.';
const LOTE_NO_EXISTE = 'El lote no existe.';

/** Reglas de la sección 7: esquema y nombre único (D41: aquí el mensaje; el índice es la red de seguridad). */
async function validar(
  ctx: Contexto,
  datos: unknown,
  excluirId?: string,
): Promise<Resultado<DatosLote>> {
  const analisis = loteSchema.safeParse(datos);
  if (!analisis.success) return fallo(erroresDeZod(analisis.error));
  if (await existeNombreLote(ctx.db, analisis.data.nombre, excluirId)) {
    return fallo({ nombre: NOMBRE_REPETIDO });
  }
  return exito(analisis.data);
}

export async function crearLote(ctx: Contexto, datos: unknown): Promise<Resultado<LoteFila>> {
  const validado = await validar(ctx, datos);
  if (!validado.ok) return validado;
  const ahora = ctx.ahora();
  const fila: LoteFila = {
    ...validado.valor,
    id: ctx.nuevoId(),
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
    pending: 1,
    sync_error: null,
    version_servidor: null,
    conflicto: null,
  };
  await insertarLote(ctx.db, fila);
  return exito(fila);
}

export async function actualizarLote(
  ctx: Contexto,
  id: string,
  datos: unknown,
): Promise<Resultado<LoteFila>> {
  const existente = await obtenerFila(ctx.db, id);
  if (existente === null) return fallo({ general: LOTE_NO_EXISTE });
  const validado = await validar(ctx, datos, id);
  if (!validado.ok) return validado;
  // Editar es el modo de arreglar un aviso de sincronización (D73): se quita y se vuelve a intentar.
  const fila: LoteFila = {
    ...existente,
    ...validado.valor,
    updated_at: ctx.ahora(),
    pending: 1,
    // Un conflicto sin resolver conserva su aviso: lo quita elegir una versión, no editar (D96).
    sync_error: existente.conflicto === null ? null : existente.sync_error,
  };
  await actualizarFila(ctx.db, fila);
  return exito(fila);
}

export function obtenerLote(ctx: Contexto, id: string): Promise<LoteFila | null> {
  return obtenerFila(ctx.db, id);
}

/** D40: el lote y todas sus labores se marcan borrados (y pendientes) en una sola transacción. */
export async function borrarLote(ctx: Contexto, id: string): Promise<boolean> {
  let borrado = false;
  const labores = await listarLaboresDeLote(ctx.db, id);
  await ctx.db.withTransactionAsync(async () => {
    const ahora = ctx.ahora();
    borrado = (await marcarLoteBorrado(ctx.db, id, ahora)) > 0;
    if (!borrado) return;
    // Las imágenes del servidor se encolan ANTES de marcar las labores como borradas (D85).
    await encolarFotosDeLote(ctx.db, id);
    await marcarLaboresDeLoteBorradas(ctx.db, id, ahora);
    await marcarCiclosDeLoteBorrados(ctx.db, id, ahora);
  });
  if (borrado) {
    for (const labor of labores) {
      if (labor.foto_uri !== null) await ctx.fotos.borrar(labor.foto_uri);
    }
  }
  return borrado;
}

export async function listarLotesConDias(ctx: Contexto, texto?: string): Promise<LoteConDias[]> {
  const hoy = ctx.hoy();
  const lotes = await listarLotes(ctx.db, texto);
  return lotes.map((lote) => ({
    ...lote,
    dias_desde_siembra: diasDesdeSiembra(lote.fecha_siembra, hoy),
  }));
}
