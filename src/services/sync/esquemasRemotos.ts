import { z } from 'zod';
import { LUCES, TIPOS_LABOR } from '@/db/modelo';
import { esFechaValida } from '../fechas';
import { camposExtraDeLabor, loteSchema } from '../validacion';

/**
 * Lo que llega del servidor es DATO, no orden: se valida igual que lo que escribe el usuario antes de
 * guardarlo en SQLite. Un elemento que no cumple se descarta y se cuenta; no rompe la sincronización.
 */
const marcas = {
  id: z.string().min(1),
  created_at: z.string().min(1),
  updated_at: z.string().min(1),
  deleted_at: z.string().min(1).nullable(),
};

export const loteRemotoSchema = loteSchema.extend(marcas);

export const laborRemotaSchema = z.object({
  ...marcas,
  lote_id: z.string().min(1),
  tipo: z.enum(TIPOS_LABOR),
  fecha: z.string().refine(esFechaValida),
  cantidad: z.number().min(0),
  unidad: z.string().max(20).nullable(),
  nota: z.string().max(500).nullable(),
  foto_url: z.string().max(2000).nullable(),
  luz: z.enum(LUCES).nullable(),
  ...camposExtraDeLabor,
});

export const cicloRemotoSchema = z.object({
  ...marcas,
  lote_id: z.string().min(1),
  cultivo: z.string().min(1).max(60),
  fecha_inicio: z.string().refine(esFechaValida),
  fecha_fin: z.string().refine(esFechaValida),
  total_kg: z.number().min(0),
});

/** Respuesta de `GET /api/<recurso>?since=`; cada elemento se valida aparte. */
export const paginaSchema = z.object({
  items: z.array(z.unknown()),
  servidor_ahora: z.string().min(1),
});

/** Identifica un documento y su versión: para reconocer el que se repite entre dos páginas. */
export const marcaSchema = z.object({ id: z.string().min(1), updated_at: z.string().min(1) });
