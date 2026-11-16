import type { PuertoReportes } from '@/services/reportes';

export interface ReporteCompartido {
  readonly tipo: 'pdf' | 'csv';
  readonly contenido: string;
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
    compartirCsv: (contenido, nombre) => guardar('csv', contenido, nombre),
  };
  function guardar(tipo: 'pdf' | 'csv', contenido: string, nombre: string): Promise<void> {
    if (reportes.fallar) return Promise.reject(new Error('No se puede compartir'));
    reportes.compartidos.push({ tipo, contenido, nombre });
    return Promise.resolve();
  }
  return reportes;
}
