import { z } from 'zod';
import type { CicloFila } from '@/db/modelo';
import { insertarCiclo, listarCiclosDeLote } from '@/repositories/cicloRepository';
import { listarCosechasDeLote } from '@/repositories/laborRepository';
import { actualizarLote, obtenerLote } from '@/repositories/loteRepository';
import type { Contexto } from './contexto';
import { esFechaValida } from './fechas';
import { sumarKg } from './produccionService';
import { erroresDeZod, exito, fallo, type Resultado } from './resultado';

const OBLIGATORIO = 'Este campo es obligatorio.';
const fecha = z
  .string({ error: OBLIGATORIO })
  .refine(esFechaValida, { error: 'Fecha inválida: usa AAAA-MM-DD.' });

export interface ContextoCierre {
  /** Siembra del ciclo que se cierra. */
  readonly fechaSiembra: string;
  readonly hoy: string;
}

/** Datos para cerrar el ciclo en curso de un lote y empezar el siguiente (D95). */
export function crearCierreSchema({ fechaSiembra, hoy }: ContextoCierre) {
  return z
    .object({
      fecha_fin: fecha,
      cultivo: z
        .string({ error: OBLIGATORIO })
        .trim()
        .min(1, { error: OBLIGATORIO })
        .max(60, { error: 'Máximo 60 caracteres.' }),
      fecha_siembra: fecha,
    })
    .check((ctx) => {
      const { fecha_fin: fin, fecha_siembra: siembra } = ctx.value;
      const error = (path: string, message: string) =>
        ctx.issues.push({ code: 'custom', input: ctx.value, path: [path], message });
      if (fin < fechaSiembra) error('fecha_fin', 'El ciclo no puede terminar antes de su siembra.');
      if (fin > hoy) error('fecha_fin', 'El cierre no puede tener fecha futura.');
      if (siembra < fin)
        error('fecha_siembra', 'La nueva siembra no puede ser anterior al cierre.');
      if (siembra > hoy) error('fecha_siembra', 'La nueva siembra no puede tener fecha futura.');
    });
}

export type DatosCierre = z.infer<ReturnType<typeof crearCierreSchema>>;

/**
 * Cierra el ciclo en curso: guarda el cultivo, sus fechas y los kilos cosechados como un ciclo cerrado, y el
 * lote empieza un ciclo nuevo (cultivo y siembra nuevos). Todo en una transacción; las labores no se tocan
 * (son el historial) y la producción del lote pasa a contar solo desde la nueva siembra.
 */
export async function cerrarCiclo(
  ctx: Contexto,
  loteId: string,
  datos: unknown,
): Promise<Resultado<CicloFila>> {
  const lote = await obtenerLote(ctx.db, loteId);
  if (lote === null) return fallo({ general: 'El lote no existe.' });
  const analisis = crearCierreSchema({
    fechaSiembra: lote.fecha_siembra,
    hoy: ctx.hoy(),
  }).safeParse(datos);
  if (!analisis.success) return fallo(erroresDeZod(analisis.error));
  const cierre = analisis.data;
  const cosechas = await listarCosechasDeLote(ctx.db, loteId, lote.fecha_siembra);
  const ahora = ctx.ahora();
  const ciclo: CicloFila = {
    id: ctx.nuevoId(),
    lote_id: loteId,
    cultivo: lote.cultivo,
    fecha_inicio: lote.fecha_siembra,
    fecha_fin: cierre.fecha_fin,
    total_kg: sumarKg(cosechas.filter((c) => c.fecha <= cierre.fecha_fin).map((c) => c.cantidad)),
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
    pending: 1,
    sync_error: null,
  };
  await ctx.db.withTransactionAsync(async () => {
    await insertarCiclo(ctx.db, ciclo);
    await actualizarLote(ctx.db, {
      ...lote,
      cultivo: cierre.cultivo,
      fecha_siembra: cierre.fecha_siembra,
      updated_at: ahora,
      pending: 1,
      sync_error: null,
    });
  });
  return exito(ciclo);
}

/** Ciclos ya cerrados del lote, del más reciente al más antiguo. */
export function listarCiclos(ctx: Contexto, loteId: string): Promise<CicloFila[]> {
  return listarCiclosDeLote(ctx.db, loteId);
}
