import type { CicloFila, LaborFila, LoteFila } from '@/db/modelo';
import { listarCiclosDeLote } from '@/repositories/cicloRepository';
import { listarLaboresDeLote } from '@/repositories/laborRepository';
import { obtenerLote } from '@/repositories/loteRepository';
import { formatearCantidad } from './cantidad';
import type { Contexto } from './contexto';
import { ETIQUETA_LUZ, ETIQUETA_TIPO } from './etiquetas';
import { formatearFecha } from './fechas';
import { COLUMNAS, CSS_REPORTE } from './plantillaReporte';
import { produccionDeLote, type Produccion } from './produccionService';
import { reporteXlsx } from './reporteXlsx';
import { exito, fallo, type Resultado } from './resultado';

export interface DatosReporte {
  readonly lote: LoteFila;
  readonly labores: readonly LaborFila[];
  readonly ciclos: readonly CicloFila[];
  readonly produccion: Produccion;
  /** Día en que se genera, `AAAA-MM-DD`. */
  readonly hoy: string;
}

export type FormatoReporte = 'pdf' | 'xlsx';

/** El contenido del reporte viene de lo que escribió el usuario: se escapa SIEMPRE antes de meterlo en HTML. */
const escapar = (texto: string): string =>
  texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const o = (valor: string | number | null): string => (valor === null ? '' : String(valor));
const dinero = (valor: number | null): string => (valor === null ? '' : formatearCantidad(valor));

/** Una labor como fila del reporte, en el mismo orden que `COLUMNAS`. */
function filaDeLabor(labor: LaborFila): string[] {
  return [
    labor.fecha,
    ETIQUETA_TIPO[labor.tipo],
    formatearCantidad(labor.cantidad),
    o(labor.unidad),
    o(labor.producto),
    o(labor.carencia_dias),
    dinero(labor.costo),
    labor.luz === null ? '' : ETIQUETA_LUZ[labor.luz],
    o(labor.nota),
  ];
}

const celdas = (valores: readonly string[], etiqueta: 'td' | 'th'): string =>
  valores.map((valor) => `<${etiqueta}>${escapar(valor)}</${etiqueta}>`).join('');

function resumenHtml({ lote, produccion, ciclos }: DatosReporte): string {
  const lineas = [
    `Cultivo: ${lote.cultivo}`,
    lote.finca === null ? '' : `Finca: ${lote.finca}`,
    `Área: ${String(lote.area_m2)} m²`,
    `Sembrado el ${formatearFecha(lote.fecha_siembra)}`,
    lote.altitud_m === null ? '' : `Altitud: ${String(lote.altitud_m)} m`,
    `Producción del ciclo en curso: ${formatearCantidad(produccion.totalKg)} kg`,
    `Costo total: ${formatearCantidad(produccion.costoTotal)}`,
    produccion.costoPorKg === null
      ? ''
      : `Costo por kg: ${formatearCantidad(produccion.costoPorKg)}`,
  ].filter((linea) => linea !== '');
  const anteriores = ciclos.map(
    (c) =>
      `${c.cultivo}: del ${formatearFecha(c.fecha_inicio)} al ${formatearFecha(c.fecha_fin)}, ${formatearCantidad(c.total_kg)} kg`,
  );
  const lista = (items: readonly string[]) =>
    `<ul>${items.map((item) => `<li>${escapar(item)}</li>`).join('')}</ul>`;
  return (
    lista(lineas) +
    (anteriores.length === 0 ? '' : `<h2>Ciclos anteriores</h2>${lista(anteriores)}`)
  );
}

/** Reporte de trazabilidad de un lote como HTML con la plantilla de la app (para convertirlo en PDF). Función pura. */
export function reporteHtml(datos: DatosReporte): string {
  const filas = datos.labores.map((labor) => `<tr>${celdas(filaDeLabor(labor), 'td')}</tr>`);
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>${CSS_REPORTE}</style>
</head><body>
<div class="banda"><div class="marca">Cuaderno de campo</div>
<h1>Cuaderno de campo: ${escapar(datos.lote.nombre)}</h1></div>
<div class="cuerpo">
<p class="nota">Generado el ${escapar(formatearFecha(datos.hoy))}. ${String(datos.labores.length)} labores.</p>
${resumenHtml(datos)}
<h2>Bitácora de labores</h2>
<table><thead><tr>${celdas(COLUMNAS, 'th')}</tr></thead><tbody>${filas.join('')}</tbody></table>
</div>
</body></html>`;
}

/** Nombre de archivo sin caracteres raros: `cuaderno-el-mirador-2026-11-16`. */
export function nombreDeReporte(lote: Pick<LoteFila, 'nombre'>, hoy: string): string {
  const base = lote.nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `cuaderno-${base === '' ? 'lote' : base}-${hoy}`;
}

/** Reúne los datos del lote, arma el reporte en el formato pedido y lo comparte desde el teléfono. */
export async function exportarReporte(
  ctx: Contexto,
  loteId: string,
  formato: FormatoReporte,
): Promise<Resultado<null>> {
  const lote = await obtenerLote(ctx.db, loteId);
  if (lote === null) return fallo({ general: 'El lote no existe.' });
  const datos: DatosReporte = {
    lote,
    labores: await listarLaboresDeLote(ctx.db, loteId),
    ciclos: await listarCiclosDeLote(ctx.db, loteId),
    produccion: await produccionDeLote(ctx, loteId),
    hoy: ctx.hoy(),
  };
  const nombre = nombreDeReporte(lote, datos.hoy);
  try {
    if (formato === 'pdf') await ctx.reportes.compartirPdf(reporteHtml(datos), `${nombre}.pdf`);
    else await ctx.reportes.compartirXlsx(reporteXlsx(datos), `${nombre}.xlsx`);
  } catch {
    return fallo({ general: 'No se pudo generar el reporte. Inténtalo de nuevo.' });
  }
  return exito(null);
}
