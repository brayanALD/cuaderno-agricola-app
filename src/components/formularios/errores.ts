import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import type { Errores } from '@/services/resultado';

/**
 * Pasa los errores que devuelve un servicio (p. ej. «Ya existe un lote con ese nombre.») al campo del
 * formulario que corresponde. Lo que no pertenece a ningún campo se devuelve como mensaje general.
 */
export function aplicarErrores<TValores extends FieldValues>(
  errores: Errores,
  setError: UseFormSetError<TValores>,
  campos: readonly Path<TValores>[],
): string | null {
  let general: string | null = null;
  for (const [campo, mensaje] of Object.entries(errores)) {
    const destino = campos.find((candidato) => candidato === campo);
    if (destino === undefined) general = mensaje;
    else setError(destino, { type: 'servidor', message: mensaje });
  }
  return general;
}
