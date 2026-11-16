import type { PuertoReportes } from '@/services/reportes';

export interface ReporteCompartido {
  readonly tipo: 'pdf' | 'xlsx';
  /** El HTML del PDF o los bytes del libro de Excel. */
  readonly contenido: string | Uint8Array;
  readonly nombre: string;
}

export interface ReportesEnMemoria extends PuertoReportes {
  readonly compartidos: ReporteCompartido[];
  /** Si es `true`, compartir falla (teléfono sin «Compartir», sin espacio…). */
  fallar: boolean;
}

/** Reportes de mentira: guardan lo que se habría compartido. */
export function crearReportesEnMemoria(): ReportesEnMemoria {
  const reportes: ReportesEnMemoria = {
    compartidos: [],
    fallar: false,
    compartirPdf: (contenido, nombre) => guardar('pdf', contenido, nombre),
    compartirXlsx: (contenido, nombre) => guardar('xlsx', contenido, nombre),
  };
  function guardar(
    tipo: 'pdf' | 'xlsx',
    contenido: string | Uint8Array,
    nombre: string,
  ): Promise<void> {
    if (reportes.fallar) return Promise.reject(new Error('No se puede compartir'));
    reportes.compartidos.push({ tipo, contenido, nombre });
    return Promise.resolve();
  }
  return reportes;
}
