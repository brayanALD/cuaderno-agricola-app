/**
 * Reglas de los gestos como funciones puras. Las que se llaman desde un gesto de Reanimated
 * llevan `'worklet'` para poder correr en el hilo de UI.
 */

export type DestinoSnap = 'anterior' | 'siguiente' | 'quedarse';

export interface EntradaSnap {
  /** Desplazamiento horizontal del dedo; negativo es hacia la izquierda. */
  readonly traslacionX: number;
  /** Velocidad horizontal al soltar, en px/s. */
  readonly velocidadX: number;
  readonly ancho: number;
  readonly hayAnterior: boolean;
  readonly haySiguiente: boolean;
}

/** Fracción del ancho que basta para cambiar de lote. */
export const FRACCION_UMBRAL = 0.3;
/** Velocidad (px/s) que basta aunque la distancia sea corta: un empujón es suficiente. */
export const VELOCIDAD_UMBRAL = 600;

/**
 * A qué lote pasa la ficha al soltar: por distancia **o** por velocidad en el mismo sentido.
 * Arrastrar a la izquierda trae el siguiente; a la derecha, el anterior.
 */
export function decidirSnap(entrada: EntradaSnap): DestinoSnap {
  'worklet';
  const { traslacionX, velocidadX, ancho, hayAnterior, haySiguiente } = entrada;
  const largo = Math.abs(traslacionX) >= ancho * FRACCION_UMBRAL;
  const mismoSentido = traslacionX !== 0 && Math.sign(velocidadX) === Math.sign(traslacionX);
  const empujon = mismoSentido && Math.abs(velocidadX) >= VELOCIDAD_UMBRAL;
  if (!largo && !empujon) return 'quedarse';
  if (traslacionX < 0) return haySiguiente ? 'siguiente' : 'quedarse';
  return hayAnterior ? 'anterior' : 'quedarse';
}

/** Borde elástico: sin lote vecino la ficha solo cede una cuarta parte del arrastre. */
export function resistencia(traslacion: number, hayVecino: boolean): number {
  'worklet';
  return hayVecino ? traslacion : traslacion * 0.25;
}

export const ESCALA_MIN = 1;
export const ESCALA_MAX = 4;
export const PASO_ESCALA = 0.5;

export function acotarEscala(escala: number): number {
  'worklet';
  return Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala));
}

/** Botones «Acercar» y «Alejar»: la alternativa al pellizco. */
export function escalaPorPasos(escala: number, pasos: number): number {
  'worklet';
  return acotarEscala(Math.round((escala + pasos * PASO_ESCALA) * 100) / 100);
}

/** Cuánto se puede desplazar la imagen ampliada antes de dejar ver el borde. */
export function limiteDesplazamiento(tamano: number, escala: number): number {
  'worklet';
  return Math.max(0, (tamano * (escala - 1)) / 2);
}

export function acotarDesplazamiento(valor: number, tamano: number, escala: number): number {
  'worklet';
  const limite = limiteDesplazamiento(tamano, escala);
  return Math.min(limite, Math.max(-limite, valor));
}
