/** Patrón `LIKE` «contiene» con `%`, `_` y `\` escapados (se usa con `ESCAPE '\'`). */
export function patronLike(texto: string): string {
  return `%${texto.trim().replace(/[\\%_]/g, (caracter) => `\\${caracter}`)}%`;
}
