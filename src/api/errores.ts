export interface DetalleApi {
  readonly campo: string;
  readonly mensaje: string;
}

/** La API respondió con un error (`{ error, detalles? }`, secciones 9.1 y 9.2). El mensaje ya viene en español. */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
    readonly detalles: readonly DetalleApi[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}

/** No hubo respuesta: sin internet, servidor caído o se acabó el tiempo de espera. */
export class ErrorDeRed extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDeRed';
  }
}
