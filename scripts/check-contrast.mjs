// Valida la paleta contra WCAG 2.2 AA (SC 1.4.3 texto 4.5:1, SC 1.4.11 componentes/gráficos 3:1).
// Uso: node scripts/check-contrast.mjs   (sale con código 1 si algún par falla)
import { readFileSync } from 'node:fs';

const palette = JSON.parse(
  readFileSync(new URL('../src/theme/palette.json', import.meta.url), 'utf8'),
);

const lin = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
export const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const TEXT = 4.5; // SC 1.4.3 texto normal
const UI = 3; // SC 1.4.11 componentes de UI, iconos y gráficos con significado

// [primer plano, fondo, mínimo, uso]
const PARES = [
  ['text', 'background', TEXT, 'texto principal sobre fondo'],
  ['text', 'surface', TEXT, 'texto principal sobre tarjeta'],
  ['text', 'surfaceMuted', TEXT, 'texto principal sobre superficie atenuada'],
  ['textMuted', 'background', TEXT, 'texto secundario sobre fondo'],
  ['textMuted', 'surface', TEXT, 'texto secundario sobre tarjeta'],
  ['textMuted', 'surfaceMuted', TEXT, 'texto secundario sobre superficie atenuada'],
  ['onPrimary', 'primary', TEXT, 'texto del botón primario'],
  ['onPrimary', 'primaryPressed', TEXT, 'texto del botón primario presionado'],
  ['primary', 'background', TEXT, 'enlaces y acciones de texto'],
  ['primary', 'surface', TEXT, 'enlaces y acciones de texto en tarjeta'],
  ['onAccent', 'accent', TEXT, 'texto sobre insignias doradas'],
  ['onDanger', 'danger', TEXT, 'texto sobre botón destructivo'],
  ['danger', 'background', TEXT, 'mensajes de error'],
  ['danger', 'surface', TEXT, 'mensajes de error en tarjeta'],
  ['border', 'background', UI, 'borde de campos y controles'],
  ['border', 'surface', UI, 'borde de campos en tarjeta'],
  ['focus', 'background', UI, 'anillo de foco'],
  ['focus', 'surface', UI, 'anillo de foco en tarjeta'],
  ['success', 'surface', UI, 'iconos y barras de progreso/éxito (nunca texto)'],
  ['primary', 'surface', UI, 'relleno de controles (switch, checkbox)'],
];

let fallos = 0;
for (const tema of ['light', 'dark']) {
  console.log(`\nTema ${tema}`);
  for (const [fg, bg, min, uso] of PARES) {
    const a = palette[tema][fg];
    const b = palette[tema][bg];
    if (!a || !b) {
      console.log(`  ?? ${fg}/${bg} no existe`);
      fallos++;
      continue;
    }
    const r = ratio(a, b);
    const ok = r >= min;
    if (!ok) fallos++;
    console.log(
      `  ${ok ? 'OK  ' : 'FALLA'} ${r.toFixed(2).padStart(5)}:1 (mín ${min}) ${fg} ${a} sobre ${bg} ${b} — ${uso}`,
    );
  }
}
console.log(
  fallos ? `\n${fallos} par(es) no cumplen WCAG 2.2 AA` : '\nTodos los pares cumplen WCAG 2.2 AA',
);
process.exit(fallos ? 1 : 0);
