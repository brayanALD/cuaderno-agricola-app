import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { PuertoFotos } from '@/services/fotos';

/** Ancho máximo de una foto guardada (D83): suficiente para ver el cultivo y pesa unos 200–400 KB. */
const ANCHO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.7;

/**
 * Adaptador real de `PuertoFotos`: `expo-image-manipulator` reduce (sin agrandar nunca las pequeñas) y
 * `expo-file-system` guarda una copia en la carpeta de documentos de la app, que Android no limpia como la
 * caché del selector (P11). Solo se prueba en un teléfono.
 */
export const fotosReal: PuertoFotos = {
  async guardar(uriOriginal, id) {
    const base = await ImageManipulator.manipulate(uriOriginal).renderAsync();
    const reducible = ImageManipulator.manipulate(base);
    if (base.width > ANCHO_MAXIMO) reducible.resize({ width: ANCHO_MAXIMO });
    const imagen = await reducible.renderAsync();
    const guardada = await imagen.saveAsync({ compress: CALIDAD_JPEG, format: SaveFormat.JPEG });

    const carpeta = new Directory(Paths.document, 'fotos');
    carpeta.create({ idempotent: true, intermediates: true });
    const destino = new File(carpeta, `${id}.jpg`);
    new File(guardada.uri).move(destino);
    return destino.uri;
  },
  async leer(uri) {
    return new Uint8Array(await new File(uri).arrayBuffer());
  },
  borrar(uri) {
    try {
      const archivo = new File(uri);
      if (archivo.exists) archivo.delete();
    } catch {
      // Un archivo que ya no está es justo lo que se quería: nada que hacer.
    }
    return Promise.resolve();
  },
};
