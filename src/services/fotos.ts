/**
 * Lo que la app necesita del almacenamiento de fotos (D83): el adaptador real usa `expo-image-manipulator`
 * y `expo-file-system`; las pruebas, uno en memoria.
 */
export interface PuertoFotos {
  /**
   * Reduce la foto elegida (1600 px de ancho, JPEG al 70 %) y guarda una copia PERMANENTE (Android puede
   * limpiar la caché del selector, P11). Devuelve la ruta de la copia.
   */
  readonly guardar: (uriOriginal: string, id: string) => Promise<string>;
  /** Los bytes de una foto guardada, para subirla. Lanza si el archivo ya no existe. */
  readonly leer: (uri: string) => Promise<Uint8Array<ArrayBuffer>>;
  /**
   * Baja una foto de otro teléfono (ya subida al servidor) a una copia local PERMANENTE (D97), para verla sin
   * conexión. `id` da nombre al archivo. Devuelve la ruta; lanza si no se pudo descargar.
   */
  readonly descargar: (url: string, id: string) => Promise<string>;
  /** Borra la copia local; no falla si ya no existe. */
  readonly borrar: (uri: string) => Promise<void>;
}
