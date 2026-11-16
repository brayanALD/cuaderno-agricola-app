import palette from '@/theme/palette.json';

/**
 * La plantilla de los reportes (PDF y Excel) sale del tema CLARO de la app (D107): los mismos colores de
 * `palette.json`, así un reporte impreso se ve como la app. Nunca hay colores escritos a mano aquí.
 */
export const TEMA = palette.light;

/** `#0B6E4F` → `0B6E4F` (así lo piden los estilos de Excel). */
export const sinAlmohadilla = (color: string): string => color.replace('#', '');

export const COLUMNAS = [
  'Fecha',
  'Labor',
  'Cantidad',
  'Unidad',
  'Producto',
  'Carencia (días)',
  'Costo',
  'Luz',
  'Nota',
] as const;

/** Hoja de estilos del PDF: banda de marca, tarjetas del resumen y tabla con encabezado verde y filas alternas. */
export const CSS_REPORTE = `
body{font-family:Roboto,Arial,sans-serif;font-size:12px;color:${TEMA.text};background:${TEMA.surface};margin:0}
.banda{background:${TEMA.primary};color:${TEMA.onPrimary};padding:18px 22px}
.banda .marca{font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${TEMA.accent};font-weight:bold}
.banda h1{margin:4px 0 0;font-size:22px}
.cuerpo{padding:16px 22px}
.nota{color:${TEMA.textMuted};margin:0 0 12px}
h2{font-size:15px;color:${TEMA.primary};border-bottom:2px solid ${TEMA.accent};padding-bottom:4px;margin:18px 0 8px}
ul{list-style:none;padding:0;margin:0;display:flex;flex-wrap:wrap}
li{background:${TEMA.primarySoft};border:1px solid ${TEMA.divider};border-radius:8px;padding:6px 10px;margin:0 8px 8px 0}
table{border-collapse:collapse;width:100%}
th{background:${TEMA.primary};color:${TEMA.onPrimary};text-align:left;padding:6px;border:1px solid ${TEMA.primary}}
td{padding:5px 6px;border:1px solid ${TEMA.divider}}
tbody tr:nth-child(even) td{background:${TEMA.surfaceMuted}}
`;
