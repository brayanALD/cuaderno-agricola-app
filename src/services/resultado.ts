import type { ZodError } from 'zod';

/** Un mensaje por campo; `general` para lo que no pertenece a ningún campo. */
export type Errores = Readonly<Record<string, string>>;

export type Resultado<T> =
  { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly errores: Errores };

export const exito = <T>(valor: T): Resultado<T> => ({ ok: true, valor });

export const fallo = (errores: Errores): Resultado<never> => ({ ok: false, errores });

/** Primer mensaje de cada campo, listo para mostrarlo junto al campo del formulario. */
export function erroresDeZod(error: ZodError): Errores {
  const errores: Record<string, string> = {};
  for (const incidencia of error.issues) {
    const campo = String(incidencia.path[0] ?? 'general');
    errores[campo] ??= incidencia.message;
  }
  return errores;
}
