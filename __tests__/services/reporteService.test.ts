import {
  exportarReporte,
  nombreDeReporte,
  reporteHtml,
  type DatosReporte,
} from '@/services/reporteService';
import { strFromU8, unzipSync } from 'fflate';
import { reporteXlsx } from '@/services/reporteXlsx';
import { TEMA } from '@/services/plantillaReporte';
import { cerrarCiclo } from '@/services/cicloService';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { laborFila, loteFila } from '../helpers/filas';
import { crearReportesEnMemoria } from '../helpers/reportesEnMemoria';

const datos = (cambios: Partial<DatosReporte> = {}): DatosReporte => ({
  lote: loteFila({ finca: 'La Aurora' }),
  labores: [
    laborFila({
      tipo: 'fumigacion',
      fecha: '2026-11-01',
      cantidad: 8,
      producto: 'Mancozeb',
      carencia_dias: 21,
      costo: 35000,
      nota: 'Control de roya',
    }),
  ],
  ciclos: [],
  produccion: { totalKg: 30.5, porMes: [], costoTotal: 35000, costoPorKg: 1147.54 },
  hoy: '2026-11-14',
  ...cambios,
});

describe('reporteHtml (D95)', () => {
  it('lleva el lote, el resumen y una fila por labor con producto, carencia y costo', () => {
    const html = reporteHtml(datos());

    expect(html).toContain('Cuaderno de campo: El Mirador');
    expect(html).toContain('Finca: La Aurora');
    expect(html).toContain('Producción del ciclo en curso: 30,5 kg');
    expect(html).toContain('Costo por kg: 1147,54');
    expect(html).toContain('<td>Fumigación</td>');
    expect(html).toContain('<td>Mancozeb</td><td>21</td><td>35000</td>');
  });

  it('ESCAPA lo que escribió el usuario: no se puede inyectar HTML en el reporte', () => {
    const html = reporteHtml(
      datos({
        lote: loteFila({ nombre: '<script>alert(1)</script>' }),
        labores: [laborFila({ nota: '<img src=x onerror="robar()"> & más' })],
      }),
    );

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x onerror=&quot;robar()&quot;&gt; &amp; más');
  });

  it('lista los ciclos anteriores cuando los hay', () => {
    const html = reporteHtml(
      datos({
        ciclos: [
          {
            id: 'c1',
            lote_id: 'lote-1',
            cultivo: 'Maíz',
            fecha_inicio: '2026-01-10',
            fecha_fin: '2026-06-15',
            total_kg: 320,
            created_at: 'x',
            updated_at: 'x',
            deleted_at: null,
            pending: 0,
            sync_error: null,
          },
        ],
      }),
    );

    expect(html).toContain('Ciclos anteriores');
    expect(html).toContain('Maíz: del 10 de enero de 2026 al 15 de junio de 2026, 320 kg');
  });
});

const abrir = (bytes: Uint8Array) =>
  Object.fromEntries(Object.entries(unzipSync(bytes)).map(([n, b]) => [n, strFromU8(b)]));

describe('reporteXlsx (D107)', () => {
  it('es un .xlsx válido: un ZIP con el libro, los estilos y las dos hojas', () => {
    const archivos = abrir(reporteXlsx(datos()));

    expect(Object.keys(archivos).sort()).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ]);
    expect(archivos['xl/workbook.xml']).toContain('name="Resumen"');
    expect(archivos['xl/workbook.xml']).toContain('name="Bitácora"');
  });

  it('la plantilla usa los colores del tema claro de la app', () => {
    const estilos = abrir(reporteXlsx(datos()))['xl/styles.xml'] ?? '';

    for (const color of [TEMA.primary, TEMA.primarySoft, TEMA.surfaceMuted, TEMA.divider]) {
      expect(estilos).toContain(`FF${color.replace('#', '')}`);
    }
  });

  it('la bitácora lleva encabezado fijo, filtro y una fila por labor con números reales', () => {
    const hoja = abrir(reporteXlsx(datos()))['xl/worksheets/sheet2.xml'] ?? '';

    expect(hoja).toContain('state="frozen"');
    expect(hoja).toContain('<autoFilter ref="A3:I4"/>');
    expect(hoja).toContain('Fumigación');
    expect(hoja).toContain('Mancozeb');
    expect(hoja).toContain('<c r="C4" s="9"><v>8</v></c>');
    expect(hoja).toContain('<c r="G4" s="9"><v>35000</v></c>');
  });

  it('el resumen trae los datos del lote y, si hay, los ciclos anteriores', () => {
    const sin = abrir(reporteXlsx(datos()))['xl/worksheets/sheet1.xml'] ?? '';
    expect(sin).toContain('El Mirador');
    expect(sin).toContain('La Aurora');
    expect(sin).not.toContain('Ciclos anteriores');

    const con =
      abrir(
        reporteXlsx(
          datos({
            ciclos: [
              {
                id: 'c1',
                lote_id: 'lote-1',
                cultivo: 'Maíz',
                fecha_inicio: '2026-01-10',
                fecha_fin: '2026-06-15',
                total_kg: 320,
                created_at: 'x',
                updated_at: 'x',
                deleted_at: null,
                pending: 0,
                sync_error: null,
              },
            ],
          }),
        ),
      )['xl/worksheets/sheet1.xml'] ?? '';
    expect(con).toContain('Ciclos anteriores');
    expect(con).toContain('<v>320</v>');
  });

  it('lo que escribió el usuario nunca es una fórmula ni rompe el XML', () => {
    const hoja =
      abrir(
        reporteXlsx(
          datos({
            labores: [laborFila({ nota: '=HYPERLINK("http://x")<&>\u0001', producto: '+cmd' })],
          }),
        ),
      )['xl/worksheets/sheet2.xml'] ?? '';

    expect(hoja).toContain('t="inlineStr"');
    expect(hoja).not.toContain('<f>');
    expect(hoja).toContain('=HYPERLINK(&quot;http://x&quot;)&lt;&amp;&gt;');
    expect(hoja).not.toContain('\u0001');
  });
});

describe('plantilla del PDF', () => {
  it('usa los colores del tema claro de la app', () => {
    const html = reporteHtml(datos());

    expect(html).toContain(TEMA.primary);
    expect(html).toContain(TEMA.surfaceMuted);
    expect(html).toContain('class="banda"');
  });
});

describe('nombreDeReporte', () => {
  it('quita acentos, espacios y símbolos', () => {
    expect(nombreDeReporte({ nombre: 'Él Mirador / Nº 2' }, '2026-11-14')).toBe(
      'cuaderno-el-mirador-n-2-2026-11-14',
    );
    expect(nombreDeReporte({ nombre: '///' }, '2026-11-14')).toBe('cuaderno-lote-2026-11-14');
  });
});

describe('exportarReporte', () => {
  async function montar() {
    const reportes = crearReportesEnMemoria();
    const ctx = { ...(await crearContextoDePrueba()), reportes };
    await crearLote(ctx, datosLote({ finca: 'La Aurora' }));
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-10-05', cantidad: 12.5 }),
    );
    return { ctx, reportes };
  }

  it('comparte el PDF con los datos del lote y un nombre de archivo limpio', async () => {
    const { ctx, reportes } = await montar();

    const resultado = await exportarReporte(ctx, 'id-1', 'pdf');

    expect(resultado.ok).toBe(true);
    expect(reportes.compartidos).toHaveLength(1);
    expect(reportes.compartidos[0]).toMatchObject({
      tipo: 'pdf',
      nombre: 'cuaderno-el-mirador-2026-11-14.pdf',
    });
    expect(reportes.compartidos[0]?.contenido).toContain('Finca: La Aurora');
  });

  it('comparte el Excel e incluye los ciclos cerrados en el PDF', async () => {
    const { ctx, reportes } = await montar();
    await cerrarCiclo(ctx, 'id-1', {
      fecha_fin: '2026-11-10',
      cultivo: 'Maíz',
      fecha_siembra: '2026-11-12',
    });

    await exportarReporte(ctx, 'id-1', 'xlsx');
    await exportarReporte(ctx, 'id-1', 'pdf');

    expect(reportes.compartidos.map((r) => r.tipo)).toEqual(['xlsx', 'pdf']);
    expect(reportes.compartidos[0]?.nombre).toBe('cuaderno-el-mirador-2026-11-14.xlsx');
    expect(reportes.compartidos[1]?.contenido).toContain('Ciclos anteriores');
  });

  it('si el teléfono no puede compartir, devuelve un error legible (no lanza)', async () => {
    const { ctx, reportes } = await montar();
    reportes.fallar = true;

    expect(await exportarReporte(ctx, 'id-1', 'pdf')).toEqual({
      ok: false,
      errores: { general: 'No se pudo generar el reporte. Inténtalo de nuevo.' },
    });
  });

  it('un lote que no existe da un error', async () => {
    const { ctx } = await montar();

    expect((await exportarReporte(ctx, 'no-existe', 'xlsx')).ok).toBe(false);
  });
});
