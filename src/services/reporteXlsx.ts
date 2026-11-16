import { ETIQUETA_LUZ, ETIQUETA_TIPO } from './etiquetas';
import { formatearFecha } from './fechas';
import { COLUMNAS, sinAlmohadilla, TEMA } from './plantillaReporte';
import type { DatosReporte } from './reporteService';
import { crearXlsx, type CeldaXlsx, type EstiloXlsx, type HojaXlsx } from './xlsx';

const c = sinAlmohadilla;

/** Posiciones de `ESTILOS`: las celdas las nombran para no depender de números sueltos. */
const E = {
  base: 0,
  banda: 1,
  titulo: 2,
  nota: 3,
  etiqueta: 4,
  valor: 5,
  encabezado: 6,
  celda: 7,
  celdaAlterna: 8,
  numero: 9,
  numeroAlterno: 10,
  seccion: 11,
} as const;

const borde = c(TEMA.divider);
const ESTILOS: readonly EstiloXlsx[] = [
  {},
  { negrita: true, tamano: 18, color: c(TEMA.onPrimary), relleno: c(TEMA.primary) },
  { negrita: true, tamano: 14, color: c(TEMA.text) },
  { color: c(TEMA.textMuted) },
  { negrita: true, color: c(TEMA.text), relleno: c(TEMA.primarySoft), borde },
  { color: c(TEMA.text), borde, alinear: 'left' },
  {
    negrita: true,
    color: c(TEMA.onPrimary),
    relleno: c(TEMA.primary),
    borde: c(TEMA.primary),
    ajustar: true,
  },
  { color: c(TEMA.text), borde, ajustar: true },
  { color: c(TEMA.text), borde, ajustar: true, relleno: c(TEMA.surfaceMuted) },
  { color: c(TEMA.text), borde, alinear: 'right', formato: 'miles' },
  { color: c(TEMA.text), borde, alinear: 'right', formato: 'miles', relleno: c(TEMA.surfaceMuted) },
  { negrita: true, color: c(TEMA.primary), borde: c(TEMA.accent) },
];

const texto = (valor: string | null, estilo: number = E.celda): CeldaXlsx => ({ valor, estilo });

function ciclosAnteriores({ ciclos }: DatosReporte): CeldaXlsx[][] {
  if (ciclos.length === 0) return [];
  return [
    [],
    [{ valor: 'Ciclos anteriores', estilo: E.seccion, columnas: 4 }],
    ['Cultivo', 'Inicio', 'Fin', 'Total (kg)'].map((t) => texto(t, E.encabezado)),
    ...ciclos.map((ciclo, i) => {
      const t = i % 2 === 1 ? E.celdaAlterna : E.celda;
      return [
        texto(ciclo.cultivo, t),
        texto(formatearFecha(ciclo.fecha_inicio), t),
        texto(formatearFecha(ciclo.fecha_fin), t),
        { valor: ciclo.total_kg, estilo: i % 2 === 1 ? E.numeroAlterno : E.numero },
      ];
    }),
  ];
}

function hojaResumen(datos: DatosReporte): HojaXlsx {
  const { lote, produccion, labores, hoy } = datos;
  const dato = (etiqueta: string, valor: string | number | null): CeldaXlsx[] => [
    texto(etiqueta, E.etiqueta),
    typeof valor === 'number' ? { valor, estilo: E.numero } : texto(valor, E.valor),
  ];
  const filas: CeldaXlsx[][] = [
    [{ valor: 'CUADERNO DE CAMPO', estilo: E.banda, columnas: 4 }],
    [{ valor: lote.nombre, estilo: E.titulo, columnas: 4 }],
    [{ valor: `Generado el ${formatearFecha(hoy)}`, estilo: E.nota, columnas: 4 }],
    [],
    dato('Cultivo', lote.cultivo),
    dato('Finca', lote.finca),
    dato('Área (m²)', lote.area_m2),
    dato('Siembra', formatearFecha(lote.fecha_siembra)),
    dato('Altitud (m)', lote.altitud_m),
    dato('Labores registradas', labores.length),
    dato('Producción del ciclo en curso (kg)', produccion.totalKg),
    dato('Costo total', produccion.costoTotal),
    dato('Costo por kg', produccion.costoPorKg),
    ...ciclosAnteriores(datos),
  ];
  return { nombre: 'Resumen', anchos: [36, 24, 24, 16], filas, alturas: { 1: 34, 2: 26 } };
}

function hojaBitacora({ lote, labores }: DatosReporte): HojaXlsx {
  const filas: CeldaXlsx[][] = [
    [{ valor: `Bitácora de labores · ${lote.nombre}`, estilo: E.banda, columnas: COLUMNAS.length }],
    [],
    COLUMNAS.map((t) => texto(t, E.encabezado)),
    ...labores.map((labor, i) => {
      const alterna = i % 2 === 1;
      const t = alterna ? E.celdaAlterna : E.celda;
      const n = alterna ? E.numeroAlterno : E.numero;
      return [
        texto(labor.fecha, t),
        texto(ETIQUETA_TIPO[labor.tipo], t),
        { valor: labor.cantidad, estilo: n },
        texto(labor.unidad, t),
        texto(labor.producto, t),
        { valor: labor.carencia_dias, estilo: n },
        { valor: labor.costo, estilo: n },
        texto(labor.luz === null ? null : ETIQUETA_LUZ[labor.luz], t),
        texto(labor.nota, t),
      ];
    }),
  ];
  return {
    nombre: 'Bitácora',
    anchos: [12, 14, 11, 9, 20, 15, 12, 11, 44],
    filas,
    alturas: { 1: 34 },
    congelar: 3,
    filtroEnFila: 3,
  };
}

/** El reporte del lote como libro de Excel con la plantilla de la app (tema claro). Función pura. */
export function reporteXlsx(datos: DatosReporte): Uint8Array {
  return crearXlsx({ estilos: ESTILOS, hojas: [hojaResumen(datos), hojaBitacora(datos)] });
}
