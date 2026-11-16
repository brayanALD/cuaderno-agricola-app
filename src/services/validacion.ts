import { z } from 'zod';
import { LUCES, TIPOS_LABOR } from '@/db/modelo';
import { esFechaValida } from './fechas';

const OBLIGATORIO = 'Este campo es obligatorio.';
const SOLO_NUMERO = 'Escribe un número.';

const cadena = z.string({ error: OBLIGATORIO });
const numero = () => z.number({ error: SOLO_NUMERO });
const fecha = cadena.refine(esFechaValida, { error: 'Fecha inválida: usa AAAA-MM-DD.' });
const texto = (max: number) =>
  cadena
    .trim()
    .min(1, { error: OBLIGATORIO })
    .max(max, { error: `Máximo ${max} caracteres.` });

/** Sección 7 de la especificación. El nombre único por usuario se comprueba en el servicio. */
export const loteSchema = z.object({
  nombre: texto(60),
  cultivo: texto(60),
  area_m2: numero()
    .int({ error: 'El área debe ser un número entero de m².' })
    .positive({ error: 'El área debe ser mayor que 0.' }),
  altitud_m: numero()
    .min(0, { error: 'La altitud mínima es 0 m.' })
    .max(6000, { error: 'La altitud máxima es 6000 m.' })
    .nullable(),
  lat: numero()
    .min(-90, { error: 'La latitud va de −90 a 90.' })
    .max(90, { error: 'La latitud va de −90 a 90.' })
    .nullable(),
  lng: numero()
    .min(-180, { error: 'La longitud va de −180 a 180.' })
    .max(180, { error: 'La longitud va de −180 a 180.' })
    .nullable(),
  fecha_siembra: fecha,
});

export type DatosLote = z.infer<typeof loteSchema>;

export interface ContextoLabor {
  readonly fechaSiembra: string;
  /** Hoy en `AAAA-MM-DD` (local); se inyecta para que la regla sea pura. */
  readonly hoy: string;
}

export function crearLaborSchema({ fechaSiembra, hoy }: ContextoLabor) {
  return z
    .object({
      tipo: z.enum(TIPOS_LABOR, { error: 'Elige un tipo de labor.' }),
      fecha,
      cantidad: numero().min(0, { error: 'La cantidad no puede ser negativa.' }),
      unidad: z.string().trim().max(20).nullable(),
      nota: z.string().trim().max(500, { error: 'Máximo 500 caracteres.' }).nullable(),
      luz: z.enum(LUCES, { error: 'Elige soleado o nublado.' }).nullable(),
      /** Foto elegida de la galería; ausente = no tocar la que ya tiene, `null` = quitarla. */
      foto_uri: z.string().max(2000).nullable().optional(),
    })
    .check((ctx) => {
      const labor = ctx.value;
      if (!esFechaValida(labor.fecha)) return;
      if (labor.fecha > hoy) {
        ctx.issues.push({
          code: 'custom',
          input: labor.fecha,
          path: ['fecha'],
          message: 'Una labor realizada no puede tener fecha futura.',
        });
      }
      if (labor.tipo === 'cosecha' && labor.fecha < fechaSiembra) {
        ctx.issues.push({
          code: 'custom',
          input: labor.fecha,
          path: ['fecha'],
          message: 'La cosecha no puede ser anterior a la siembra.',
        });
      }
    });
}

export type DatosLabor = z.infer<ReturnType<typeof crearLaborSchema>>;
