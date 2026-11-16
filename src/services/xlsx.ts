import { strToU8, zipSync } from 'fflate';

/**
 * Escritor mínimo de libros `.xlsx` (D107): un ZIP con XML. Solo lo que necesitan los reportes: texto y números,
 * estilos (negrita, color, relleno, borde, formato), anchos de columna, celdas combinadas, fila fija y filtro.
 * Los textos van como cadenas en línea (nunca como fórmulas): lo que escribió el usuario no se ejecuta en Excel.
 */

export interface EstiloXlsx {
  readonly negrita?: boolean;
  readonly tamano?: number;
  /** Color del texto, `RRGGBB`. */
  readonly color?: string;
  /** Color de relleno, `RRGGBB`. */
  readonly relleno?: string;
  /** Color del borde fino, `RRGGBB`. */
  readonly borde?: string;
  readonly alinear?: 'left' | 'center' | 'right';
  readonly ajustar?: boolean;
  /** `miles`: `#,##0.##`. */
  readonly formato?: 'miles';
}

export interface CeldaXlsx {
  readonly valor: string | number | null;
  /** Posición en `LibroXlsx.estilos`; 0 si falta. */
  readonly estilo?: number;
  /** Cuántas columnas ocupa (se combinan). */
  readonly columnas?: number;
}

export interface HojaXlsx {
  readonly nombre: string;
  /** Ancho de cada columna, en caracteres. */
  readonly anchos: readonly number[];
  readonly filas: readonly (readonly CeldaXlsx[])[];
  /** Alto de filas concretas (1 = primera), en puntos. */
  readonly alturas?: Readonly<Record<number, number>>;
  /** Filas de arriba que no se desplazan. */
  readonly congelar?: number;
  /** Fila (1 = primera) cuyos encabezados llevan filtro. */
  readonly filtroEnFila?: number;
}

export interface LibroXlsx {
  /** El estilo 0 es el de las celdas sin estilo. */
  readonly estilos: readonly EstiloXlsx[];
  readonly hojas: readonly HojaXlsx[];
}

const CABECERA = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PAQUETE = 'http://schemas.openxmlformats.org/package/2006/relationships';

const INVALIDOS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

/** Escapa un texto para meterlo en XML (contenido o atributo) y quita lo que XML no admite. */
export const escaparXml = (texto: string): string =>
  texto
    .replace(INVALIDOS, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** 1 → «A», 27 → «AA». */
export function letraDeColumna(numero: number): string {
  let resto = numero;
  let letras = '';
  while (resto > 0) {
    const medida = (resto - 1) % 26;
    letras = String.fromCharCode(65 + medida) + letras;
    resto = Math.floor((resto - 1) / 26);
  }
  return letras;
}

const direccion = (columna: number, fila: number): string =>
  `${letraDeColumna(columna)}${String(fila)}`;

/** Excel limita el nombre de una hoja a 31 caracteres y prohíbe `[]:*?/\`. */
export const nombreDeHoja = (nombre: string): string =>
  nombre
    .replace(/[[\]:*?/\\]/g, ' ')
    .trim()
    .slice(0, 31) || 'Hoja';

function estilosXml(estilos: readonly EstiloXlsx[]): string {
  const fuentes: string[] = [];
  const rellenos = [
    '<fill><patternFill patternType="none"/></fill>',
    '<fill><patternFill patternType="gray125"/></fill>',
  ];
  const bordes = ['<border><left/><right/><top/><bottom/><diagonal/></border>'];
  const indice = (lista: string[], xml: string): number => {
    const existente = lista.indexOf(xml);
    if (existente >= 0) return existente;
    lista.push(xml);
    return lista.length - 1;
  };
  const lado = (nombre: string, color: string) =>
    `<${nombre} style="thin"><color rgb="FF${color}"/></${nombre}>`;
  const xfs = estilos.map((estilo) => {
    const fuente = `<font>${estilo.negrita ? '<b/>' : ''}<sz val="${String(estilo.tamano ?? 11)}"/><color rgb="FF${estilo.color ?? '000000'}"/><name val="Calibri"/></font>`;
    const relleno = estilo.relleno
      ? indice(
          rellenos,
          `<fill><patternFill patternType="solid"><fgColor rgb="FF${estilo.relleno}"/><bgColor indexed="64"/></patternFill></fill>`,
        )
      : 0;
    const borde = estilo.borde
      ? indice(
          bordes,
          `<border>${lado('left', estilo.borde)}${lado('right', estilo.borde)}${lado('top', estilo.borde)}${lado('bottom', estilo.borde)}<diagonal/></border>`,
        )
      : 0;
    const alineacion = `<alignment vertical="center"${estilo.alinear ? ` horizontal="${estilo.alinear}"` : ''}${estilo.ajustar ? ' wrapText="1"' : ''}/>`;
    return `<xf numFmtId="${estilo.formato === 'miles' ? '164' : '0'}" fontId="${String(indice(fuentes, fuente))}" fillId="${String(relleno)}" borderId="${String(borde)}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">${alineacion}</xf>`;
  });
  const lista = (nombre: string, items: readonly string[]) =>
    `<${nombre} count="${String(items.length)}">${items.join('')}</${nombre}>`;
  return `${CABECERA}<styleSheet xmlns="${NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts>${lista('fonts', fuentes)}${lista('fills', rellenos)}${lista('borders', bordes)}<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>${lista('cellXfs', xfs)}<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}

function celdaXml(celda: CeldaXlsx, columna: number, fila: number): string {
  const ref = direccion(columna, fila);
  const estilo = ` s="${String(celda.estilo ?? 0)}"`;
  if (typeof celda.valor === 'number' && Number.isFinite(celda.valor)) {
    return `<c r="${ref}"${estilo}><v>${String(celda.valor)}</v></c>`;
  }
  if (typeof celda.valor === 'string' && celda.valor !== '') {
    return `<c r="${ref}"${estilo} t="inlineStr"><is><t xml:space="preserve">${escaparXml(celda.valor)}</t></is></c>`;
  }
  return `<c r="${ref}"${estilo}/>`;
}

/** Una fila: cada celda combinada deja sus vecinas vacías pero con el mismo estilo (así el relleno y el borde cubren todo). */
function filaXml(
  fila: readonly CeldaXlsx[],
  numero: number,
  alto: number | undefined,
  combinadas: string[],
): string {
  let columna = 1;
  const partes: string[] = [];
  for (const celda of fila) {
    partes.push(celdaXml(celda, columna, numero));
    const ancho = celda.columnas ?? 1;
    for (let extra = 1; extra < ancho; extra++) {
      partes.push(celdaXml({ valor: null, estilo: celda.estilo }, columna + extra, numero));
    }
    if (ancho > 1)
      combinadas.push(`${direccion(columna, numero)}:${direccion(columna + ancho - 1, numero)}`);
    columna += ancho;
  }
  const altura = alto === undefined ? '' : ` ht="${String(alto)}" customHeight="1"`;
  return `<row r="${String(numero)}"${altura}>${partes.join('')}</row>`;
}

function hojaXml(hoja: HojaXlsx): string {
  const combinadas: string[] = [];
  const filas = hoja.filas.map((fila, i) =>
    filaXml(fila, i + 1, hoja.alturas?.[i + 1], combinadas),
  );
  const columnas = hoja.anchos
    .map(
      (ancho, i) =>
        `<col min="${String(i + 1)}" max="${String(i + 1)}" width="${String(ancho)}" customWidth="1"/>`,
    )
    .join('');
  const congelar = hoja.congelar ?? 0;
  const panel =
    congelar > 0
      ? `<pane ySplit="${String(congelar)}" topLeftCell="A${String(congelar + 1)}" activePane="bottomLeft" state="frozen"/>`
      : '';
  const ultima = Math.max(
    ...hoja.filas.map((fila) => fila.reduce((suma, c) => suma + (c.columnas ?? 1), 0)),
    1,
  );
  const filtro =
    hoja.filtroEnFila === undefined
      ? ''
      : `<autoFilter ref="A${String(hoja.filtroEnFila)}:${direccion(ultima, hoja.filas.length)}"/>`;
  const unidas =
    combinadas.length === 0
      ? ''
      : `<mergeCells count="${String(combinadas.length)}">${combinadas.map((c) => `<mergeCell ref="${c}"/>`).join('')}</mergeCells>`;
  return `${CABECERA}<worksheet xmlns="${NS}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0">${panel}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${columnas}</cols><sheetData>${filas.join('')}</sheetData>${filtro}${unidas}<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

/** El libro como bytes de un `.xlsx`. Función pura. */
export function crearXlsx(libro: LibroXlsx): Uint8Array {
  const numeradas = libro.hojas.map((hoja, i) => ({ hoja, numero: i + 1 }));
  const archivos: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `${CABECERA}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${numeradas.map(({ numero }) => `<Override PartName="/xl/worksheets/sheet${String(numero)}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    ),
    '_rels/.rels': strToU8(
      `${CABECERA}<Relationships xmlns="${NS_PAQUETE}"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ),
    'xl/workbook.xml': strToU8(
      `${CABECERA}<workbook xmlns="${NS}" xmlns:r="${NS_REL}"><sheets>${numeradas.map(({ hoja, numero }) => `<sheet name="${escaparXml(nombreDeHoja(hoja.nombre))}" sheetId="${String(numero)}" r:id="rId${String(numero)}"/>`).join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `${CABECERA}<Relationships xmlns="${NS_PAQUETE}">${numeradas.map(({ numero }) => `<Relationship Id="rId${String(numero)}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${String(numero)}.xml"/>`).join('')}<Relationship Id="rId${String(numeradas.length + 1)}" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`,
    ),
    'xl/styles.xml': strToU8(estilosXml(libro.estilos)),
  };
  for (const { hoja, numero } of numeradas) {
    archivos[`xl/worksheets/sheet${String(numero)}.xml`] = strToU8(hojaXml(hoja));
  }
  return zipSync(archivos);
}
