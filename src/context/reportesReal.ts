import { File, Paths } from 'expo-file-system';
import { printToFileAsync } from 'expo-print';
import { isAvailableAsync, shareAsync } from 'expo-sharing';
import type { PuertoReportes } from '@/services/reportes';

/** Abre «Compartir» con el archivo; si el teléfono no puede compartir, falla y la app lo explica. */
async function compartir(uri: string, mimeType: string, titulo: string): Promise<void> {
  if (!(await isAvailableAsync())) throw new Error('Este teléfono no permite compartir archivos.');
  await shareAsync(uri, { mimeType, dialogTitle: titulo });
}

/**
 * Adaptador real de `PuertoReportes` (D95). Los archivos van a la caché de la app: son copias para compartir,
 * no datos que haya que conservar. Solo se prueba en un teléfono.
 */
export const reportesReal: PuertoReportes = {
  async compartirPdf(html, nombre) {
    const { uri } = await printToFileAsync({ html });
    const destino = new File(Paths.cache, nombre);
    if (destino.exists) destino.delete();
    new File(uri).move(destino);
    await compartir(destino.uri, 'application/pdf', 'Compartir el reporte en PDF');
  },
  async compartirCsv(csv, nombre) {
    const archivo = new File(Paths.cache, nombre);
    if (archivo.exists) archivo.delete();
    archivo.create();
    archivo.write(csv);
    await compartir(archivo.uri, 'text/csv', 'Compartir el reporte en CSV');
  },
};
