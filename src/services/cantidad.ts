const redondear = (valor: number): number => Math.round(valor * 100) / 100;

/** Suma `pasos` de tamaño `paso` sin bajar de 0 (cantidad ≥ 0) ni pasar de `max`. Sirve a los botones y al gesto. */
export function ajustarCantidad(valor: number, pasos: number, paso: number, max?: number): number {
  const acotada = Math.max(0, redondear(valor + pasos * paso));
  return max === undefined ? acotada : Math.min(max, acotada);
}

export interface Arrastre {
  readonly inicial: number;
  /** Desplazamiento vertical del dedo en píxeles; negativo es hacia arriba. */
  readonly traslacionY: number;
  readonly pxPorPaso: number;
  readonly paso: number;
  readonly max?: number;
}

/** Gesto de arrastre vertical: hacia arriba aumenta la cantidad y hacia abajo la reduce. */
export function cantidadPorArrastre({
  inicial,
  traslacionY,
  pxPorPaso,
  paso,
  max,
}: Arrastre): number {
  if (!(pxPorPaso > 0)) throw new RangeError('pxPorPaso debe ser mayor que cero.');
  return ajustarCantidad(inicial, Math.round(-traslacionY / pxPorPaso), paso, max);
}

/** Cantidad para mostrar al usuario: coma decimal, como en los totales de producción (H3). Sin separador de miles. */
export const formatearCantidad = (valor: number): string => String(valor).replace('.', ',');
