/** La base de antes de las cuentas (un solo `cuaderno.db`). Ya no se usa; se borra al arrancar (D62). */
export const NOMBRE_BASE_ANTIGUA = 'cuaderno.db';

/** Los `uid` de Firebase son alfanuméricos; esto además impide `/`, `..` o espacios en un nombre de archivo. */
const UID_SEGURO = /^[A-Za-z0-9_-]{1,128}$/;

/** Una base SQLite por usuario (D60): `cuaderno-<uid>.db`. Cada cuenta ve solo sus datos locales. */
export function nombreDeBaseDeUsuario(uid: string): string {
  if (!UID_SEGURO.test(uid)) throw new Error('Identificador de usuario no válido.');
  return `cuaderno-${uid}.db`;
}
