import { readFileSync } from 'node:fs';
import { z } from 'zod';

const datos = z.record(z.string(), z.unknown());

const recurso = z.object({
  campos: z.array(z.string()),
  opcionales: z.array(z.string()),
  ejemplo: datos,
  documento: datos,
  invalidos: z.array(
    z.object({
      motivo: z.string(),
      cambios: datos,
      campo: z.string(),
      alcance: z.array(z.enum(['api', 'app'])),
    }),
  ),
});

const detalle = z.object({ campo: z.string(), mensaje: z.string() });

/** La forma del contrato compartido con la app (`contrato/contrato.json`, D101). */
const contratoSchema = z.object({
  version: z.number().int(),
  recursos: z.object({ lotes: recurso, labores: recurso, ciclos: recurso }),
  version_base: z.object({
    campo: z.string(),
    recursos: z.array(z.string()),
    conflicto: z.object({ estado: z.number(), campo: z.string() }),
  }),
  cambios: z.object({
    ruta: z.string(),
    limite: z.number().int(),
    peticion: z.object({ cambios: z.array(datos) }),
    respuesta: z.object({ resultados: z.array(datos) }),
  }),
  consulta_labores: z.object({
    parametros: z.array(z.string()),
    limite_por_defecto: z.number().int(),
    limite_maximo: z.number().int(),
    respuesta_con_filtros: z.array(z.string()),
    respuesta_sincronizacion: z.array(z.string()),
  }),
  error: z.object({
    peticion: z.object({ recurso: z.string(), cambios: datos }),
    ejemplo: z.object({ error: z.string(), detalles: z.array(detalle) }),
  }),
});

export type Contrato = z.infer<typeof contratoSchema>;

/** Lee y valida el contrato: si el archivo cambia de forma, esto falla antes que cualquier prueba. */
export function leerContrato(ruta = 'contrato/contrato.json'): Contrato {
  return contratoSchema.parse(JSON.parse(readFileSync(ruta, 'utf8')));
}
