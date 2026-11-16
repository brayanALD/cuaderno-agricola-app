# Diseño y accesibilidad

Paleta del proyecto: **verde-esmeralda-dorado** (Coolors): `#073b3a` Dark Teal · `#0b6e4f` Dark Emerald ·
`#08a045` Medium Jungle · `#6bbf59` Moss Green · `#ddb771` Soft Fawn.
Fuente única de los tokens: `src/theme/palette.json`. Validación reproducible: `npm run check:contrast`.

## Criterios (estándares internacionales)

| Criterio | Fuente | Umbral aplicado |
|---|---|---|
| Contraste de texto | WCAG 2.2 · SC 1.4.3 (AA) | ≥ 4,5:1 (texto normal) |
| Contraste de componentes y gráficos | WCAG 2.2 · SC 1.4.11 (AA) | ≥ 3:1 (bordes de campos, iconos, foco, rellenos de controles) |
| No depender solo del color | WCAG 2.2 · SC 1.4.1 | Estado = color **+** icono/texto |
| Texto redimensionable | WCAG 2.2 · SC 1.4.4 | Layouts que crecen hasta 200 % (sin alturas fijas) |
| Tamaño del objetivo táctil | WCAG 2.2 · SC 2.5.8 (mín. 24 px) y guías de plataforma | **≥ 48 dp** (Material/Android; Apple HIG pide 44 pt) |
| Foco visible | WCAG 2.2 · SC 2.4.7 (AA); el 3:1 sale de SC 1.4.11 | Anillo `focus` ≥ 3:1 |
| Movimiento reducido | WCAG 2.2 · SC 2.3.3 (AAA, buena práctica) y ajuste del sistema | Respetar `useReducedMotion` |
| Gesto con alternativa | WCAG 2.2 · SC 2.5.1 | Todo gesto complejo tiene botón con `accessibilityLabel` |

## Decisión de neutrales y contraste (tomada por la IA, validada con cálculo; puedes cambiarla)

La paleta no trae neutros. Se derivaron **tintados hacia el verde azulado** de Dark Teal (matiz ≈ 179°) para que armonicen,
en lugar de grises puros. La sospecha de partida se confirmó con números:

| Combinación | Contraste | Veredicto |
|---|---|---|
| Blanco sobre `#08a045` | **3,43:1** | ❌ texto normal (necesita 4,5) · ✅ solo iconos/barras |
| `#073b3a` sobre `#08a045` | 3,61:1 | ❌ texto normal |
| Blanco sobre `#0b6e4f` | 6,25:1 | ✅ botón primario |
| `#6bbf59` sobre blanco | 2,28:1 | ❌ nunca como texto sobre claro |
| `#ddb771` sobre blanco | 1,89:1 | ❌ nunca como texto sobre claro |
| `#073b3a` sobre `#ddb771` | 6,54:1 | ✅ insignias doradas con texto oscuro |

**Reglas de uso por color**

- `primary` (#0B6E4F): botones, enlaces, acciones. Texto encima: `onPrimary` (blanco).
- `success` (#08A045): **solo** iconos, barras de progreso y rellenos (≥ 3:1). Jamás fondo de texto.
- `accent` (#DDB771): insignias/destacados con texto `onAccent` (#073B3A). En oscuro sirve además de anillo de foco.
- Moss (#6BBF59): en el tema oscuro es el `primary` (7,56:1 sobre el fondo); en claro, solo decorativo.
- `danger` (#B3261E claro / #FFB4AB oscuro): **no está en la paleta**; se añadió porque un error necesita un color
  reconocible. Siempre con icono y texto.

## Tokens (claro / oscuro)

| Token | Claro | Oscuro |
|---|---|---|
| background | `#F4F7F5` | `#041F1E` |
| surface | `#FFFFFF` | `#073B3A` |
| surfaceMuted | `#E6EDEA` | `#0B4A47` |
| text | `#0B1F1E` | `#EAF3F0` |
| textMuted | `#475957` | `#B4CCC7` |
| border (controles) | `#6F817D` | `#7FA39D` |
| primary / onPrimary | `#0B6E4F` / `#FFFFFF` | `#6BBF59` / `#041F1E` |
| accent / onAccent | `#DDB771` / `#073B3A` | `#DDB771` / `#041F1E` |
| success | `#08A045` | `#6BBF59` |
| danger / onDanger | `#B3261E` / `#FFFFFF` | `#FFB4AB` / `#410002` |
| focus | `#073B3A` | `#DDB771` |

Resultado actual: **40/40 pares cumplen AA** (20 por tema). Mínimos reales: 3,43:1 (success sobre blanco, límite UI de 3:1) y
4,50:1 (borde sobre superficie oscura, límite de 3:1).

## Uso en NativeWind v5 (decisión D17)

NativeWind v5 define el tema en CSS (`@theme`), no en `tailwind.config.js`. `src/theme/palette.json` sigue siendo la **única
fuente**: `node scripts/gen-theme-css.mjs` genera `src/theme/theme.css` (`--color-background`, `--color-surface-muted`…) y
`global.css` lo importa. Los tokens quedan como utilidades semánticas (`bg-background`, `text-text`, `bg-primary`,
`text-on-primary`…). Si cambias `palette.json`, vuelve a ejecutar el generador: una prueba de `npm run check` falla si
`theme.css` queda desfasado. Prohibido hex sueltos en `app/` y `src/` (lo aplica ESLint). Hoy `theme.css` solo emite el tema
claro y fija `:root { font-size: 16px }` (D53).

**Modo oscuro (D31 y D46).** Cada variable está en `@theme` (genera las utilidades) y en `:root` (valor de arranque), y
`metro.config.js` las excluye del inlining. `EsquemaProvider` (`src/theme/`) aplica con `VariableContextProvider` los valores
claro u oscuro de `palette.json` según el ajuste del sistema; las clases (`bg-background`, `text-text`…) no cambian. Lo que no
usa clases (iconos, pestañas, encabezados) toma los colores de `useColores()`. Pruebas: `__tests__/theme/`.

**Componentes base (`src/components/`).** `Texto` (variante + tono, para que dos clases de color nunca compitan), `Boton`,
`BotonIcono` (etiqueta obligatoria), `CampoTexto`, `Selector` (grupo de opciones con ✓), `CampoFecha`, `MensajeError`,
`Estados` + `Vista` (los 4 estados), `Pantalla`. Todo control táctil mide ≥ 48 dp y tiene borde de foco; los errores son icono +
texto y se anuncian; el gesto de cada acción tiene su botón con `accessibilityLabel`.

## Límites honestos

- El script mide contraste de pares de color; **no** sustituye una auditoría de accesibilidad. Queda por hacer: prueba manual
  con **TalkBack** en el A35, texto al 200 %, tamaño de objetivos y orden de foco.
- El contraste real en pantalla varía con el brillo y el panel (probar al aire libre: es una app de campo).
