import palette from './palette.json';

export type Esquema = 'light' | 'dark';
export type TokenColor = keyof typeof palette.light;
export type ColoresDeTema = Readonly<Record<TokenColor, string>>;

const aKebab = (nombre: string): string =>
  nombre.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);

/** `surfaceMuted` → `--color-surface-muted` (el mismo nombre que genera `scripts/gen-theme-css.mjs`). */
export const aVariable = (token: string): string => `--color-${aKebab(token)}`;

/** Colores crudos del esquema, para lo que no usa clases (iconos, barra de pestañas, navegación). */
export function coloresDeTema(esquema: Esquema): ColoresDeTema {
  return palette[esquema];
}

/** Valores de las variables CSS que `VariableContextProvider` aplica según el esquema (D46). */
export function variablesDeTema(esquema: Esquema): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette[esquema]).map(([token, valor]) => [aVariable(token), valor]),
  );
}
