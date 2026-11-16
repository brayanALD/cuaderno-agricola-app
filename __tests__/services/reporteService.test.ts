import {
  exportarReporte,
  nombreDeReporte,
  reporteCsv,
  reporteHtml,
  type DatosReporte,
} from '@/services/reporteService';
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

describe('reporteCsv', () => {
  it('usa punto y coma, BOM para los acentos y una fila por labor', () => {
    const csv = reporteCsv(datos());
    const lineas = csv.slice(1).trim().split('\r\n');

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(lineas[0]).toBe(
      'Lote;Cultivo;Fecha;Labor;Cantidad;Unidad;Producto;Carencia (días);Costo;Luz;Nota',
    );
    expect(lineas[1]).toBe(
      'El Mirador;Café;2026-11-01;Fumigación;8;L;Mancozeb;21;35000;;Control de roya',
    );
  });

  it('pone entre comillas lo que lleva ; o comillas, y desactiva las fórmulas de Excel', () => {
    const csv = reporteCsv(
      datos({
        labores: [laborFila({ nota: 'dijo "ya"; listo', producto: '=HYPERLINK("http://x")' })],
      }),
    );

    expect(csv).toContain('"dijo ""ya""; listo"');
    expect(csv).toContain('"\'=HYPERLINK(""http://x"")"');
    expect(csv).not.toContain(';=HYPERLINK');
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

  it('comparte el CSV e incluye los ciclos cerrados en el PDF', async () => {
    const { ctx, reportes } = await montar();
    await cerrarCiclo(ctx, 'id-1', {
      fecha_fin: '2026-11-10',
      cultivo: 'Maíz',
      fecha_siembra: '2026-11-12',
    });

    await exportarReporte(ctx, 'id-1', 'csv');
    await exportarReporte(ctx, 'id-1', 'pdf');

    expect(reportes.compartidos.map((r) => r.tipo)).toEqual(['csv', 'pdf']);
    expect(reportes.compartidos[0]?.nombre).toBe('cuaderno-el-mirador-2026-11-14.csv');
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

    expect((await exportarReporte(ctx, 'no-existe', 'csv')).ok).toBe(false);
  });
});
