import type { LaborFila, LoteFila } from '@/db/modelo';
import { encolarBorradoDeFoto } from '@/repositories/fotoRepository';
import {
  actualizarLabor as actualizarFila,
  insertarLabor,
  listarLaboresDeLote as listarDeLote,
  listarLaboresRecientes as listarRecientes,
  marcarLaborBorrada,
  obtenerLabor as obtenerFila,
} from '@/repositories/laborRepository';
import { listarLotes, obtenerLote } from '@/repositories/loteRepository';
import type { Contexto } from './contexto';
import { erroresDeZod, exito, fallo, type Resultado } from './resultado';
import { sugerirProximaLabor, type Sugerencia } from './proximaLabor';
import { crearLaborSchema, type DatosLabor } from './validacion';

const LABOR_NO_EXISTE = 'La labor no existe.';
const LOTE_NO_EXISTE = 'El lote no existe.';

function validar(ctx: Contexto, lote: LoteFila, datos: unknown): Resultado<DatosLabor> {
  const esquema = crearLaborSchema({ fechaSiembra: lote.fecha_siembra, hoy: ctx.hoy() });
  const analisis = esquema.safeParse(datos);
  return analisis.success ? exito(analisis.data) : fallo(erroresDeZod(analisis.error));
}

/** Las cosechas se registran siempre en kg (D42). */
const unidadDe = (datos: DatosLabor): string | null =>
  datos.tipo === 'cosecha' ? 'kg' : datos.unidad;

/**
 * Una foto que ya no se usa (D85): su imagen del servidor se borrará en la próxima sincronización (queda en
 * cola aunque no haya red) y la copia local se borra ya.
 */
async function descartarFoto(
  ctx: Contexto,
  labor: Pick<LaborFila, 'foto_uri' | 'foto_url'>,
): Promise<void> {
  if (labor.foto_url !== null) await encolarBorradoDeFoto(ctx.db, labor.foto_url);
  if (labor.foto_uri !== null) await ctx.fotos.borrar(labor.foto_uri);
}

export async function crearLabor(
  ctx: Contexto,
  loteId: string,
  datos: unknown,
): Promise<Resultado<LaborFila>> {
  const lote = await obtenerLote(ctx.db, loteId);
  if (lote === null) return fallo({ general: LOTE_NO_EXISTE });
  const validado = validar(ctx, lote, datos);
  if (!validado.ok) return validado;
  const ahora = ctx.ahora();
  const fila: LaborFila = {
    ...validado.valor,
    unidad: unidadDe(validado.valor),
    id: ctx.nuevoId(),
    lote_id: loteId,
    foto_uri: validado.valor.foto_uri ?? null,
    foto_url: null,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
    pending: 1,
    sync_error: null,
  };
  await insertarLabor(ctx.db, fila);
  return exito(fila);
}

export async function actualizarLabor(
  ctx: Contexto,
  id: string,
  datos: unknown,
): Promise<Resultado<LaborFila>> {
  const existente = await obtenerFila(ctx.db, id);
  if (existente === null) return fallo({ general: LABOR_NO_EXISTE });
  const lote = await obtenerLote(ctx.db, existente.lote_id);
  if (lote === null) return fallo({ general: LOTE_NO_EXISTE });
  const validado = validar(ctx, lote, datos);
  if (!validado.ok) return validado;
  const nuevaFoto =
    validado.valor.foto_uri === undefined ? existente.foto_uri : validado.valor.foto_uri;
  const cambiaFoto = nuevaFoto !== existente.foto_uri;
  const fila: LaborFila = {
    ...existente,
    ...validado.valor,
    unidad: unidadDe(validado.valor),
    foto_uri: nuevaFoto,
    // Otra foto (o ninguna): la URL de la vieja ya no vale y la nueva se subirá en la próxima sincronización.
    foto_url: cambiaFoto ? null : existente.foto_url,
    updated_at: ctx.ahora(),
    pending: 1,
    sync_error: null,
  };
  await actualizarFila(ctx.db, fila);
  if (cambiaFoto) await descartarFoto(ctx, existente);
  return exito(fila);
}

/** Gesto de mantener presionado: misma labor con la fecha de hoy y sin la foto del día original. */
export async function duplicarLabor(ctx: Contexto, id: string): Promise<Resultado<LaborFila>> {
  const original = await obtenerFila(ctx.db, id);
  if (original === null) return fallo({ general: LABOR_NO_EXISTE });
  const ahora = ctx.ahora();
  const copia: LaborFila = {
    ...original,
    id: ctx.nuevoId(),
    fecha: ctx.hoy(),
    foto_uri: null,
    foto_url: null,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
    pending: 1,
    sync_error: null,
  };
  await insertarLabor(ctx.db, copia);
  return exito(copia);
}

export async function borrarLabor(ctx: Contexto, id: string): Promise<boolean> {
  const labor = await obtenerFila(ctx.db, id);
  const borrada = (await marcarLaborBorrada(ctx.db, id, ctx.ahora())) > 0;
  if (borrada && labor !== null) await descartarFoto(ctx, labor);
  return borrada;
}

export function obtenerLabor(ctx: Contexto, id: string): Promise<LaborFila | null> {
  return obtenerFila(ctx.db, id);
}

export function listarLaboresDeLote(ctx: Contexto, loteId: string): Promise<LaborFila[]> {
  return listarDeLote(ctx.db, loteId);
}

export function listarLaboresRecientes(ctx: Contexto, limite = 20): Promise<LaborFila[]> {
  return listarRecientes(ctx.db, limite);
}

export interface ProximaLabor {
  readonly lote: LoteFila;
  readonly sugerencia: Sugerencia;
}

/** RF-03 para todos los lotes vivos: la sugerencia más urgente primero (los vencidos, antes). */
export async function proximasLaboresPorLote(ctx: Contexto): Promise<ProximaLabor[]> {
  const lotes = await listarLotes(ctx.db);
  const hoy = ctx.hoy();
  const proximas = await Promise.all(
    lotes.map(async (lote) => ({
      lote,
      sugerencia: sugerirProximaLabor(lote.fecha_siembra, await listarDeLote(ctx.db, lote.id), hoy),
    })),
  );
  return proximas.sort(
    (a, b) =>
      a.sugerencia.diasRestantes - b.sugerencia.diasRestantes ||
      a.lote.nombre.localeCompare(b.lote.nombre),
  );
}

/** RF-03: `null` si el lote no existe. */
export async function proximaLaborDeLote(
  ctx: Contexto,
  loteId: string,
): Promise<Sugerencia | null> {
  const lote = await obtenerLote(ctx.db, loteId);
  if (lote === null) return null;
  const labores = await listarDeLote(ctx.db, loteId);
  return sugerirProximaLabor(lote.fecha_siembra, labores, ctx.hoy());
}
