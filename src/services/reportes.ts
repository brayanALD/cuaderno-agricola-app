/**
 * Lo que la app necesita para sacar un reporte del teléfono (D95): el adaptador real usa `expo-print`,
 * `expo-file-system` y `expo-sharing`; las pruebas, uno en memoria.
 */
export interface PuertoReportes {
  /** Convierte el HTML en un PDF y abre el menú «Compartir» del sistema. */
  readonly compartirPdf: (html: string, nombre: string) => Promise<void>;
  /** Guarda el texto como `.csv` (se abre en Excel) y abre el menú «Compartir». */
  readonly compartirCsv: (csv: string, nombre: string) => Promise<void>;
}
