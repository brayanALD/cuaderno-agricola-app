// Genera src/theme/theme.css (tema de NativeWind v5) desde src/theme/palette.json,
// que es la única fuente de los tokens de color.
// Uso: node scripts/gen-theme-css.mjs          escribe el archivo
//      node scripts/gen-theme-css.mjs --check  sale con código 1 si el archivo está desfasado
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const PALETTE_URL = new URL('../src/theme/palette.json', import.meta.url);
const CSS_URL = new URL('../src/theme/theme.css', import.meta.url);

const aKebab = (nombre) => nombre.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);

const construirCss = (tokens) => {
  const variables = Object.entries(tokens).map(
    ([token, valor]) => `  --color-${aKebab(token)}: ${valor};`,
  );
  return [
    '/* GENERADO por scripts/gen-theme-css.mjs desde src/theme/palette.json. No editar a mano. */',
    '/* Valores del tema claro. El oscuro lo aplica EsquemaProvider en tiempo de ejecución (D46): */',
    '/* @theme genera las utilidades (bg-background…) y :root da el valor de arranque. */',
    '@theme {',
    ...variables,
    '}',
    '',
    ':root {',
    // react-native-css toma el `rem` de este valor (por defecto 14 px): con 16 px, `min-h-12` son 48 dp.
    '  font-size: 16px;',
    ...variables,
    '}',
    '',
  ].join('\n');
};

const palette = JSON.parse(readFileSync(PALETTE_URL, 'utf8'));
const esperado = construirCss(palette.light);

if (process.argv.includes('--check')) {
  const actual = existsSync(CSS_URL) ? readFileSync(CSS_URL, 'utf8') : null;
  if (actual !== esperado) {
    console.error(
      'src/theme/theme.css no coincide con palette.json. Ejecuta: node scripts/gen-theme-css.mjs',
    );
    process.exit(1);
  }
  console.log('theme.css sincronizado con palette.json');
} else {
  writeFileSync(CSS_URL, esperado);
  console.log('Escrito src/theme/theme.css');
}
