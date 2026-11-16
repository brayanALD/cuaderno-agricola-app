import type { PuertoFotos } from '@/services/fotos';

/** Fotos en memoria: cada archivo es un `Uint8Array`; `guardar` crea la «copia permanente». */
export function crearFotosEnMemoria() {
  const archivos = new Map<string, Uint8Array<ArrayBuffer>>();
  const puerto: PuertoFotos = {
    guardar: (original, id) => {
      const uri = `file:///permanente/${id}.jpg`;
      archivos.set(uri, new Uint8Array(archivos.get(original) ?? [9, 9, 9]));
      return Promise.resolve(uri);
    },
    leer: (uri) => {
      const bytes = archivos.get(uri);
      return bytes === undefined
        ? Promise.reject(new Error(`No existe ${uri}`))
        : Promise.resolve(bytes);
    },
    borrar: (uri) => {
      archivos.delete(uri);
      return Promise.resolve();
    },
  };
  return {
    ...puerto,
    archivos,
    /** Deja un archivo «ya existente» (lo que devolvería el selector de galería). */
    sembrar: (uri: string, bytes: Uint8Array<ArrayBuffer> = new Uint8Array([1, 2, 3])) => {
      archivos.set(uri, bytes);
    },
  };
}

export type FotosEnMemoria = ReturnType<typeof crearFotosEnMemoria>;
