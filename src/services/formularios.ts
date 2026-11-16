import { z } from 'zod';
import type { LaborFila, Luz, LoteFila, TipoLabor } from '@/db/modelo';
import { UNIDAD_SUGERIDA } from './etiquetas';
import { crearLaborSchema, loteSchema, type ContextoLabor } from './validacion';

/**
 * Lo que se escribe en un formulario es texto; el esquema de dominio valida números. Aquí se
 * convierte de uno a otro (D30: react-hook-form + zod) y se muestran los datos guardados como texto.
 */

const aNumero = (texto: string): number =>
  texto.trim() === '' ? Number.NaN : Number(texto.trim().replace(',', '.'));

const aNumeroONulo = (texto: string): number | null =>
  texto.trim() === '' ? null : aNumero(texto);

const comoTexto = (valor: number | null): string => (valor === null ? '' : String(valor));

export interface ValoresLote {
  nombre: string;
  cultivo: string;
  finca: string;
  area_m2: string;
  altitud_m: string;
  lat: string;
  lng: string;
  fecha_siembra: string;
}

export const valoresLoteVacios = (hoy: string): ValoresLote => ({
  nombre: '',
  cultivo: '',
  finca: '',
  area_m2: '',
  altitud_m: '',
  lat: '',
  lng: '',
  fecha_siembra: hoy,
});

export function valoresDesdeLote(lote: LoteFila): ValoresLote {
  return {
    nombre: lote.nombre,
    cultivo: lote.cultivo,
    finca: lote.finca ?? '',
    area_m2: String(lote.area_m2),
    altitud_m: comoTexto(lote.altitud_m),
    lat: comoTexto(lote.lat),
    lng: comoTexto(lote.lng),
    fecha_siembra: lote.fecha_siembra,
  };
}

export function aDatosLote(valores: ValoresLote): z.input<typeof loteSchema> {
  return {
    nombre: valores.nombre,
    cultivo: valores.cultivo,
    finca: valores.finca,
    area_m2: aNumero(valores.area_m2),
    altitud_m: aNumeroONulo(valores.altitud_m),
    lat: aNumeroONulo(valores.lat),
    lng: aNumeroONulo(valores.lng),
    fecha_siembra: valores.fecha_siembra,
  };
}

/** Texto → datos de dominio → validación, en un solo esquema para `zodResolver`. */
export const esquemaFormularioLote = z
  .object({
    nombre: z.string(),
    cultivo: z.string(),
    finca: z.string(),
    area_m2: z.string(),
    altitud_m: z.string(),
    lat: z.string(),
    lng: z.string(),
    fecha_siembra: z.string(),
  })
  .transform(aDatosLote)
  .pipe(loteSchema);

export interface ValoresLabor {
  tipo: TipoLabor;
  fecha: string;
  cantidad: number;
  unidad: string;
  nota: string;
  luz: Luz | null;
  foto_uri: string | null;
  /** Producto, días de carencia y costo se escriben como texto (vacío = sin dato) (D95). */
  producto: string;
  carencia_dias: string;
  costo: string;
}

/**
 * Una labor nueva empieza en «riego», de hoy, salvo que se pida otro tipo (p. ej. el que toca en el lote):
 * nunca queda un tipo sin elegir y la unidad es la sugerida para él.
 */
export const valoresLaborVacios = (hoy: string, tipo: TipoLabor = 'riego'): ValoresLabor => ({
  tipo,
  fecha: hoy,
  cantidad: 0,
  unidad: UNIDAD_SUGERIDA[tipo],
  nota: '',
  luz: null,
  foto_uri: null,
  producto: '',
  carencia_dias: '',
  costo: '',
});

export function valoresDesdeLabor(labor: LaborFila): ValoresLabor {
  return {
    tipo: labor.tipo,
    fecha: labor.fecha,
    cantidad: labor.cantidad,
    unidad: labor.unidad ?? '',
    nota: labor.nota ?? '',
    luz: labor.luz,
    foto_uri: labor.foto_uri,
    producto: labor.producto ?? '',
    carencia_dias: comoTexto(labor.carencia_dias),
    costo: comoTexto(labor.costo),
  };
}

const textoONulo = (texto: string): string | null => (texto.trim() === '' ? null : texto.trim());

/** Tipos de labor en los que se aplica un producto (D95). */
export const conProducto = (tipo: TipoLabor): boolean => tipo === 'fumigacion' || tipo === 'abono';

type EntradaLabor = z.input<ReturnType<typeof crearLaborSchema>>;

export function aDatosLabor(valores: ValoresLabor): EntradaLabor {
  return {
    tipo: valores.tipo,
    fecha: valores.fecha,
    cantidad: valores.cantidad,
    unidad: textoONulo(valores.unidad),
    nota: textoONulo(valores.nota),
    luz: valores.luz,
    foto_uri: valores.foto_uri,
    // El producto solo aplica a fumigación y abono, y la carencia solo a fumigación: fuera de ahí se descartan.
    producto: conProducto(valores.tipo) ? valores.producto : null,
    carencia_dias: valores.tipo === 'fumigacion' ? aNumeroONulo(valores.carencia_dias) : null,
    costo: aNumeroONulo(valores.costo),
  };
}

/** El esquema depende del lote (fecha de siembra) y de hoy: por eso es una fábrica. */
export function crearEsquemaFormularioLabor(contexto: ContextoLabor) {
  return z
    .object({
      tipo: z.enum(['riego', 'abono', 'fumigacion', 'poda', 'cosecha']),
      fecha: z.string(),
      cantidad: z.number(),
      unidad: z.string(),
      nota: z.string(),
      luz: z.enum(['soleado', 'nublado']).nullable(),
      foto_uri: z.string().nullable(),
      producto: z.string(),
      carencia_dias: z.string(),
      costo: z.string(),
    })
    .transform(aDatosLabor)
    .pipe(crearLaborSchema(contexto));
}
