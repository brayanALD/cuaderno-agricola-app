# Bitácora de uso de IA

Formato por entrada: **Propósito · Evidencia · Validación · Decisión**. Aquí van también los casos en que se **rechazó o
corrigió** lo que propuso la IA (mínimo 3).

## 2026-11-14 · Sesión 0 · Preparación de repositorios y configuración de IA (ambos repos)

**Propósito.** Crear los dos repositorios, su arquitectura, la configuración de IA propia, la paleta validada y el plan de 7 días.

**Evidencia.** `AGENTS.md`, `.claude/`, `ia/`, `docs/`, `src/theme/palette.json`, `scripts/check-contrast.mjs`.

**Validación.** Hook: `npm run test:hooks` 27/27. Paleta: `npm run check:contrast` sin fallos en claro y oscuro (se confirmó la sospecha inicial: blanco sobre `#08a045` da 3,43:1, por eso ese verde queda solo para iconos y barras). Sintaxis de
`.claude/settings.json` contrastada con la documentación oficial. Lo que requiere WSL2 queda **PENDIENTE** en
`ia/PRUEBAS-CONTENCION.md`.

**Decisión.** Configuración estricta desde el primer commit; trabajo real solo dentro de WSL2.
**Limitación de esta sesión (declarada).** La sesión 0 se ejecutó desde la carpeta padre y en Windows nativo, **sin sandbox** (no existe ahí) y antes de que existiera esta configuración, porque era la sesión que la crea. Esa IA leyó archivos de `Downloads` y consultó documentación web. Desde la Fase 1 toda sesión se abre en la raíz de un repo, dentro de WSL2, con la configuración activa.

### Casos en que se rechazó o corrigió a la IA

| # | Propuesta o candidata de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 1 | Skill `expo-overview` (candidata al revisar el repositorio de Expo) | Su `SKILL.md` ordena ejecutar `npx --yes @expo/agent-cli@latest …` (código sin versión fija) y consultar `@expo/ui` primero; choca con «no instalar sin avisar», con las dependencias justificadas y con la decisión de NativeWind | **Rechazada**, no se instala |
| 2 | Recomendar `firebase-auth-basics` y `firebase-firestore` (en el plan inicial aparecían «condicionales») | Tras leerlas: empujan al SDK de cliente, a `firebase deploy` y a crear bases Enterprise en la nube; contradicen la arquitectura solo-Admin, el emulador y «nada con efecto fuera sin permiso» | **Rechazadas**, no se instalan |
| 3 | Hook `guard.mjs` primera versión | La prueba 04 falló: el filtro «la ruta debe existir» dejaba pasar `Write` a una carpeta externa inexistente (Write crea padres) | **Corregido** con modo estricto para herramientas de archivo + prueba `12b`; 27/27 |
| 4 | Skills de `skills.sh` con nombres del plan inicial (`expo-tailwind-setup`, `expo-deployment`) | Ya no existen con ese nombre en el repositorio actual (HEAD `ab6cb2c`) | Sustituidas: `expo-design-system` cubre tokens con NativeWind; el APK se hace con la documentación de EAS |

## 2026-11-14 · Sesión 0b · Decisión: trabajar en Windows sin sandbox (temporal)

**Propósito.** Seguir desarrollando mientras WSL2 no se puede instalar.

**Evidencia.** `docs/FASE0-WSL.md` (diagnóstico con logs de CBS/DISM), `ia/CONFIGURACION.md` (sección «Modo temporal en Windows»),
`.claude/settings.local.json` (no versionado), hook con 31 pruebas.

**Validación.** `npm run test:hooks` 31/31 en ambos repos. El sandbox NO se pudo validar (no existe en Windows).

**Decisión.** El usuario eligió «avanzar ya en Windows sin sandbox, temporal» frente a limpiar caché de Windows Update, ISO de
Windows o máquina virtual. Se le advirtió que va contra la hoja (IA configurada ANTES de generar código y dentro del sandbox).

### Casos en que se rechazó o corrigió a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 5 | «La actualización de Windows ya se descargó completa» (leyendo el evento 41 del registro) | Falso: ese evento era de Defender; `IsDownloaded = False` y el build no cambió. El usuario reinició sin necesidad | **Corregido**; antes de afirmar se comprueba el estado real, no solo un evento |
| 6 | Hook sin cubrir `powershell`/`pwsh`/`cmd` y herramienta PowerShell permitida | En Windows nativo rodean las reglas de Bash y el hook | **Corregido**: `deny PowerShell` local + hook ampliado + 3 pruebas |
| 7 | Prueba `16c` con ruta sin comillas (`C:/Program Files/...`) | El error era de la prueba (un shell tampoco la ejecutaría así), no del hook | **Corregida la prueba**, no el hook |

## 2026-11-14 · Sesión 1 · Base del proyecto Expo SDK 58 con `npm run check` en verde

**Propósito.** Dejar el proyecto base (Expo Router + TypeScript estricto + NativeWind + ESLint + Prettier + Jest) sin pantallas ni
lógica de negocio, y `npm run check` en verde con el proyecto vacío. Sin comandos de git.

**Evidencia.** `app.json`, `tsconfig.json`, `metro.config.js`, `postcss.config.mjs`, `global.css`, `css.d.ts`,
`nativewind-env.d.ts`, `app/_layout.tsx`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `jest.config.js`,
`scripts/gen-theme-css.mjs`, `src/theme/theme.css` (generado), `__tests__/theme/*.test.ts`, `package.json`/`package-lock.json`,
`docs/DECISIONES.md` (D14–D20, P9–P10; P3 cerrado), `docs/DISENO.md` (sección NativeWind).

**Validación (resultados reales).**

- `npm run check` termina con código 0: `tsc --noEmit`, `eslint . --max-warnings 0`, `prettier --check .`, Jest 4/4 pruebas, hook
  31/31 y contraste AA (20 pares por tema).
- **Prueba roja antes de la verde:** `theme-css.test.ts` falló con `theme.css` ausente y pasó al generarlo.
- Las reglas ESLint **sí disparan**: sobre un archivo temporal malo saltaron `no-explicit-any`, `no-console`, hex suelto,
  `eqeqeq`, `max-depth` y `ban-ts-comment` (archivo borrado). **No se demostró** con ejemplo `complexity`, `max-lines` ni
  `max-lines-per-function`.
- `npx expo install --check`: «Dependencies are up to date». `npx expo export --platform android`: compila (1723 módulos, bundle
  Hermes 4 MB); aviso esperado de `react-native-css` por 47 declaraciones del `preflight` sin equivalente en React Native.
- **Límites que `check` no cubre:** el umbral de cobertura del 80 % no se ejerce todavía (`src/services` y `src/repositories`
  están vacíos: Jest pasa con 0 archivos); no se probó en ningún dispositivo ni con `expo start`; nada verifica que las
  clases de NativeWind (`bg-primary`…) se vean bien en pantalla; el soporte de 32 bits del Redmi A2 con RN 0.88 sigue sin comprobar.
- `npm audit`: 28 vulnerabilidades (1 baja, 27 moderadas), todas en dependencias transitivas de herramientas de desarrollo
  (`glob`, `minimatch`, `deepmerge`). **No se corrigieron** (`audit fix --force` rompe versiones fijadas por el SDK).
- **Estado pendiente:** la subcarpeta `.scaffold-tmp/` sigue en el repo. `rm -rf` está denegado por permisos y por `AGENTS.md`;
  no se borró con otro método. Está ignorada por ESLint, Prettier y Git; hay que eliminarla fuera de esta sesión.

**Decisión.** Scaffold con `create-expo-app` en subcarpeta temporal (A), pruebas en `/__tests__`, NativeWind v5 RC con tokens
generados, y lint/Prettier sin `.claude/` ni `*.md` (D15–D18, elegidas por Brayan). Las demás, ver D14, D19 y D20.

### Casos en que se corrigió o se rechazó a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 8 | Plan que dejaba fuera `react-dom` («solo Android») | `npm install @types/node` falló con `ERESOLVE`: `expo-router` arrastra Radix, que pide `react-dom`, y npm resolvía 19.3.1 con `react@19.3.0`. Ese desajuste ya existía en el árbol | **Corregido**: `react-dom@19.3.0` fijado (D20) |
| 9 | `tsconfig` con `types: ["jest"]` y sin declaración de CSS | `tsc` dio 4 errores: faltaban los tipos de Node para las pruebas y el `import '../global.css'` no tenía tipo | **Corregido**: `@types/node@24.19.2` explícito y `css.d.ts` |
| 10 | Instalaciones con el prefijo por defecto de npm | Guardó `^` en `react`, `react-native`, `reanimated`, `worklets`, `jest`, `eslint`… que el SDK espera exactos | **Corregido**: versiones fijadas a mano y `npm install` para sincronizar el lockfile |
| 11 | «Plan aprobado» tras `ExitPlanMode` | El hook bloqueó escribir el archivo del plan (ruta fuera del repo): la aprobación se dio sobre un plan **vacío** | **Corregido**: se avisó, se volvió a presentar el plan completo en el chat y se pidió confirmación antes de editar |
| 12 | Comandos de solo lectura del propio asistente | El hook los bloqueó por **falsos positivos** (`'\n'` en `tr`, `cd ../..`, `//` y `/*` dentro de un `heredoc`) | **Se reescribieron los comandos** (herramientas de lectura, archivo temporal); no se rodeó el hook. Queda anotado como limitación de `guard.mjs` |
| 13 | Permiso verbal para `rm -rf` de la carpeta temporal | Choca con `AGENTS.md` y con `permissions.deny`, que lo siguen bloqueando | **No se rodeó**; el borrado queda pendiente (ver Validación) |

## 2026-11-14 · Sesión 2 · Hito 1 (parte 1): decisiones, dependencias y lógica pura

**Propósito.** Cerrar las decisiones abiertas del Hito 1 (P1, P2, P4-UUID, P5, P8, P10, RF-03, iconos), instalar las dependencias y
escribir la lógica pura con prueba primero: días desde la siembra, próxima labor, altitud desde presión, cantidad por arrastre/botón
y validación de lote y labor. Sin pantallas todavía. Sin comandos de git.

**Evidencia.** `docs/DECISIONES.md` (D21–D37; cerradas P1-gestos, P2, P5, P8, P10 y UUID de P4; nueva P3b), `package.json`,
`src/services/{modelo,fechas,proximaLabor,altitud,cantidad,validacion}.ts`, `__tests__/services/*.test.ts`.

**Validación (resultados reales).**

- `npm run check` termina con código 0: `tsc`, `eslint --max-warnings 0`, Prettier, Jest 78/78, hook 31/31 y contraste AA.
- **Prueba roja antes de la verde:** las 5 suites fallaron con «Cannot find module» antes de crear los módulos.
- Cobertura de `src/services`: 100 % en sentencias, ramas, funciones y líneas (la primera pasada dejó una rama sin cubrir: la guarda de
  fecha inexistente en `validacion.ts`; se añadió su prueba). Por primera vez el umbral del 80 % se ejerce de verdad.
- Casos de la especificación cubiertos: criterio 1 (90 días), criterio 3 (sin barómetro → GPS con aviso, `elegirAltitud`) y la regla
  de `altitud_desde_presión` (1013,25 hPa → 0 m). Criterio 2 (suma exacta de cosechas) queda para el repositorio/servicio de producción.
- `npx expo install --check`: «Dependencies are up to date».
- **Límites:** nada se probó en un dispositivo; los intervalos de D36 son valores genéricos inventados por la IA; la interpretación
  «un tipo nunca registrado toma la siembra como base» y «solo la cosecha exige fecha ≥ siembra» son de la IA (revisables);
  `lat`/`lng` con rango válido (−90..90, −180..180) es una regla añadida por la IA que la especificación no pide.
- `npm audit`: 28 vulnerabilidades (1 baja, 27 moderadas) en herramientas de desarrollo; sin cambios respecto a la sesión 1.

**Decisión.** Brayan eligió los 4 gestos, SQLite adelantado, `react-hook-form + zod`, modo oscuro desde el inicio, modelo local
alineado con Firestore, `expo-crypto`, galería con `expo-image-picker`, sin React Compiler, tabla fija de periodos e iconos con
`@expo/vector-icons`. Es más alcance que el plan base: si falta tiempo se recorta primero el pellizco, luego el deslizamiento.

### Casos en que se corrigió o se rechazó a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 14 | Ofrecí «react-hook-form + zod» como **dos** dependencias nuevas | Para conectar zod a los formularios hace falta también `@hookform/resolvers`: son **tres** | **Corregido antes de instalar** y avisado al usuario (D30); peers verificados con `npm view` |
| 15 | `ReadonlyArray<T>` en `proximaLabor.ts` | ESLint (`@typescript-eslint/array-type`) lo rechaza con `--max-warnings 0` | **Corregido** a `readonly T[]` |
| 16 | `expo install` dejó `app.json` listo | Reescribió el archivo y `prettier --check` falló en 6 archivos (5 míos y `app.json`) | **Corregido** formateando solo esos archivos, sin tocar el resto |
| 17 | La cobertura «da 98,5 %, está bien» | Una rama sin probar: qué pasa si llega una fecha inexistente a la validación cruzada | **Corregido** con una prueba; ahora 100 % |

## 2026-11-14 · Sesión 3 · Hito 1 (parte 2): SQLite, repositorios y servicios

**Propósito.** Capa de datos completa y probada, sin pantallas: esquema y migraciones, repositorios SQL parametrizados, servicios
(lotes, labores, producción, búsqueda) con borrado lógico en cascada, nombre único, duplicar labor y total de cosecha. Sin git.

**Evidencia.** `docs/DECISIONES.md` (D38–D42; cerrada P3b), `src/db/{modelo,tipos,migraciones,expo}.ts`,
`src/repositories/{like,loteRepository,laborRepository}.ts`, `src/services/{contexto,resultado,loteService,laborService,
produccionService,busquedaService}.ts`, `__tests__/{db,repositories,services,helpers}/`.

**Validación (resultados reales).**

- `npm run check` termina con código 0: `tsc`, `eslint --max-warnings 0`, Prettier, Jest 148/148 (15 suites), hook 31/31 y contraste AA.
- Cobertura de `src/services` y `src/repositories`: 100 % en sentencias, ramas, funciones y líneas.
- **Prueba roja antes de la verde** en repositorios y servicios (suites fallaron con «Cannot find module»).
- Criterios de aceptación 1 (90 días en `listarLotesConDias`) y 2 (3 cosechas: 12,5 + 8,25 + 3,1 = 23,85 kg exactos, por mes) pasan
  contra SQLite real. El criterio 3 sigue cubierto por `elegirAltitud`.
- **Mutaciones** para validar pruebas escritas tarde: bajar el `CHECK` del área, quitar el filtro de borrados en `listarLotes` y dejar de
  escapar `%`/`\` en `LIKE` hicieron fallar sus pruebas; el código se restauró y volvió el verde.
- Restricciones del esquema comprobadas con SQLite real: `CHECK`, clave foránea, `ON DELETE CASCADE` físico, índice único parcial
  sin distinguir mayúsculas solo entre lotes no borrados, y migración atómica (si falla, `user_version` queda en 0).
- **Límites que `check` no cubre:** `src/db/expo.ts` (abrir la base real, WAL, `foreign_keys`) solo se verificó con `tsc`: no se ejecutó
  en un teléfono. `node:sqlite` (SQLite 3.51) no es el motor de Android y su API es «experimental» (aviso en consola al correr Jest).
  `src/db/` no entra en el umbral de cobertura (solo servicios y repositorios). Los mensajes de zod para tipos incorrectos (p. ej.
  `null` en vez de objeto) salen en inglés: la UI debe enviar números ya convertidos. Si dos escrituras chocan con el índice único
  en carrera, el error de SQLite no se traduce a mensaje de campo todavía.
- Las funciones de `__tests__/helpers/baseEnMemoria.ts` usan `as T` para los resultados genéricos de `node:sqlite` (no hay otra forma
  de tipar `get`/`all`); está solo en el ayudante de pruebas.

**Decisión.** Brayan eligió `node:sqlite` para probar, `LIKE` en lotes y labores, borrado lógico en cascada e índice único + chequeo
previo (D38–D41). Detalles de la IA en D42: migraciones por `user_version`, cosechas siempre en kg.

### Casos en que se corrigió o se rechazó a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 18 | Escribí `migraciones.ts` y `like.ts` **antes** de sus pruebas | Rompe «primero la prueba que falla» (AGENTS.md) | **Reconocido**; se compensó con mutaciones (arriba). Mi primer intento de mutar `like.ts` con `sed` no cambió nada y lo repetí con la herramienta de edición |
| 19 | `SQLiteDatabase` de `expo-sqlite` «ya cumple» la interfaz `Db` | `tsc` falló: la real exige `params` obligatorio y arreglos mutables; mi interfaz los tenía opcionales y de solo lectura | **Corregido** con un adaptador explícito `comoDb` (sin `as`), en vez de aflojar la interfaz de los repositorios |
| 20 | Prueba de `proximaLaborDeLote` esperando «riego» | El código seguía D36 y sugería la fumigación vencida (nunca registrada, base = siembra) | **Se corrigió la prueba, no el código**; se añadió otra que documenta esa interpretación |
| 21 | Prueba de búsqueda con `'CAFÉ'` esperando hallar `'Café'` | `LIKE` de SQLite solo ignora mayúsculas en ASCII | **Se corrigió la prueba** y se dejó una que documenta la limitación aceptada en D39 |

## 2026-11-14 · Sesión 4 · Hito 1 (parte 3): contexto y hooks

**Propósito.** Cerrar pendientes (borrar carpetas de plantilla, completar el stack en AGENTS.md) y construir la capa de estado de la
UI: `CuadernoProvider`, `useCarga` con los 4 estados (carga, vacío, error, reintento) y los hooks de lectura y escritura. Sin pantallas.

**Evidencia.** `docs/DECISIONES.md` (D43–D45), `AGENTS.md` (línea de stack), `src/context/{CuadernoContext.tsx,aError.ts,contextoReal.ts}`,
`src/hooks/{useCarga,useLotes,useLabores,useAcciones}.ts`, `__tests__/{context,hooks,helpers/envolver.tsx}`.

**Validación (resultados reales).**

- `npm run check` termina con código 0: `tsc`, `eslint --max-warnings 0`, Prettier, Jest 172/172 (18 suites), hook 31/31 y contraste AA.
- **Prueba roja antes de la verde** (3 suites con «Cannot find module»).
- **Mutaciones:** quitar la invalidación en `useAcciones` hizo fallar 8 pruebas; quitar la guarda `if (vigente)` de `useCarga` hizo fallar la
  de «respuesta obsoleta». Código restaurado y verde de nuevo.
- Cobertura medida aparte (sin cambiar `jest.config.js`) de `src/hooks` y `src/context`: 95 % en sentencias, 90 % en ramas. Lo único en 0 %
  es `contextoReal.ts` (necesita un dispositivo). El umbral oficial sigue midiendo solo servicios y repositorios: ahí 100 %.
- Carpetas de plantilla (`.scaffold-tmp/` en la app, `scaffold-tmp/` en la API): se listaron (51 y 8 archivos, sin `node_modules`, ni un
  archivo del usuario) y se borraron con `rm -rf` **por instrucción expresa de Brayan**; ambos repos conservan todo lo demás.
- **Límites:** nada se probó en un dispositivo ni con `expo start`; `abrirContextoReal` y `abrirBaseDeDatos` aún no han corrido en un teléfono;
  `CuadernoProvider` espera una referencia **estable** de `abrir` (si se crea en cada render, reabriría la base: está documentado en el código,
  no impuesto por el tipo); el contador de versión recarga todas las lecturas activas (D43).

**Decisión.** Brayan eligió contador de versión en Context y provider propio (D43, D44) y pidió la edición de AGENTS.md y el borrado (D45).

### Casos en que se corrigió o se rechazó a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 22 | Prueba que esperaba ver «cargando» justo después de `renderHook` | `renderHook` de RNTL 14 es asíncrono y ya espera a que se resuelva la promesa: el estado ya era «listo» | **Se corrigió la prueba** con una carga controlada por la propia prueba (promesa diferida) |
| 23 | Prueba «recarga sin volver a cargando» que miraba el estado un instante | Era trivialmente verdadera: no demostraba que nunca apareciera «cargando» | **Reescrita** registrando cada render del hook y comprobando que no hay «cargando» tras la invalidación |
| 24 | Tras el permiso verbal anterior, di por buena la regla «no `rm -rf`» | Antes dije que el permiso verbal no levantaba el `deny`; esta vez Brayan lo pidió de nuevo y la orden corrió sin bloqueo en esta sesión (iniciada en la carpeta padre, donde no rigen los permisos de cada repo) | **Se ejecutó solo sobre dos rutas exactas, revisadas antes.** Queda anotado como excepción (D45); la regla sigue vigente |

## 2026-11-14 · Sesión 5 · Hito 1 (parte 4): tema, componentes, pantallas, ubicación y gestos

**Propósito.** Terminar la parte visible del Hito 1: layout raíz, tema claro/oscuro, componentes base accesibles, las 4 pantallas
de la especificación más las de edición y foto (D48), formularios con `react-hook-form` + `zod`, ubicación/altitud y los 4 gestos,
cada uno con botón alterno. Sin comandos de git.

**Evidencia.** `docs/DECISIONES.md` (D46–D57, P11–P13), `docs/DISENO.md`, `docs/PLAN.md`, `app/` (layout, `(tabs)`, `lote/`, `labor/`,
`foto/`), `src/theme/`, `src/components/` (+ `formularios/`), `src/sensors/`, `src/hooks/`, `src/services/{gestos,formularios,etiquetas}.ts`,
`jest.config.js` + `jest.setup*.js`, `__tests__/{app,components,hooks,sensors,theme,services,helpers}`.

**Validación (resultados reales).**

- `npm run check` termina con código 0: `tsc`, `eslint --max-warnings 0`, Prettier, Jest **43 suites / 396 pruebas**, hook 31/31 y contraste AA.
  Cobertura de `src/services` y `src/repositories`: 100 % en sentencias, funciones y líneas, 95,2 % en ramas.
- `npx expo export --platform android` compila el árbol completo (2170 módulos, bundle Hermes de 5,6 MB) antes y después del refactor.
- **Criterios de aceptación en la UI:** 1 («90 días» en la lista y en la ficha), 2 (3 cosechas = 23,85 kg exactos, con el desglose por
  mes en la ficha) y 3 (sin barómetro, altitud del GPS con aviso de menor precisión; sin ambos, a mano) pasan contra SQLite real.
- **Mutaciones:** subir el umbral del snap de 0,3 a 0,9 hizo fallar 4 pruebas (gestos y deslizar); quitar la invalidación de
  `useAcciones` y la guarda contra respuestas obsoletas (sesión 4) siguen detectadas. Una mutación de `aplicarErrores` **no** se
  detectó al principio (ver caso 28).
- Las reglas de lectura de sensores se prueban con *mocks*: `isAvailableAsync()` antes de usar, permiso solo al pulsar, `subscription.remove()`
  al salir y la app nunca se rompe sin sensor o permiso.
- **Límites (importantes):** **nada se ha ejecutado en un teléfono**: ni `expo start`, ni los gestos con dedos reales, ni TalkBack,
  ni el barómetro (ningún celular lo tiene), ni el rendimiento en el Redmi A2. Los tipos estrictos de rutas no se pudieron verificar
  (P13). Las fotos se guardan por su ruta de caché (P11). El deslizar puede pelearse con el gesto de volver de Android 16 (P12).
  `abrirContextoReal`/`abrirBaseDeDatos` siguen sin correr en un dispositivo.

**Decisión.** Brayan eligió `VariableContextProvider`, `Tabs` de JS, rutas adicionales, pan con snap propio y `datetimepicker`
(D46–D50, esta última distinta de mi recomendación). Detalles de la IA en D51–D57. Dependencias nuevas fuera del stack de AGENTS.md:
`@react-native-community/datetimepicker` y `expo-sensors` (no las edito: lo hace Brayan).

### Casos en que se corrigió o se rechazó a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 25 | Escribí `gestos.ts` y sus pruebas de seguida | No vi la prueba roja de esa pieza antes de implementar (las pruebas sí estaban escritas antes) | **Reconocido**; el umbral del snap se validó después con una mutación |
| 26 | `render`, `act` y el helper `montar` sin `await` (3 veces) | En RNTL 14 `render`, `renderHook` y `act` son asíncronos: se expandía una promesa y los tests corrían antes del montaje | **Corregido** en cada helper |
| 27 | Botón «Acercar» leía la escala del valor compartido | Con dos toques rápidos leía el valor a medias de la animación y daba 1,5× en vez de 2×: **defecto real** del código | **Corregido** con una escala objetivo en JS (la prueba lo reveló) |
| 28 | Prueba «el error del servidor aparece bajo su campo» | Solo comprobaba que el texto saliera: pasaba aunque el error se mostrara como mensaje general (mutación no detectada) | **Reforzada**: ahora comprueba que el campo queda marcado y los demás no |
| 29 | Creí que `expo export` regeneraría `.expo/types/router.d.ts` | Falso: solo lo hace `expo start`. El archivo era un artefacto obsoleto (sin rutas) y lo borré | **Pendiente P13**; avisado al usuario |
| 30 | Pantallas y componentes de 60–110 líneas | ESLint (`max-lines-per-function` ≤ 50) rechazó 9 funciones y el compilador de React prohibió mutar `ref` recibidos como argumento | **Refactor** en subcomponentes y hooks; no se apagó ninguna regla |
| 31 | Matcher `toHaveAnimatedStyle` y `getAnimatedStyle` | Los tipos que resuelve TypeScript son los de la versión web (`void`) | **`jest.requireActual<T>`** con el tipo correcto, sin conversiones |
| 32 | D31 decía «variantes `dark:`» | La guía v5 de temas documenta `VariableContextProvider` para tokens semánticos; se preguntó y Brayan eligió esa | **D46** reemplaza la implementación de D31 |

## 2026-11-15 · Sesión 6 · Hito 3 (parte 1): login en la app

**Propósito.** Login obligatorio en la app (D60): registro e inicio de sesión contra la API, tokens en `expo-secure-store`, renovación
automática del token, rutas protegidas, cierre de sesión y una base SQLite por usuario. En el mismo día se construyó la API
(otro repo; su bitácora lo cuenta). Sin comandos de git.

**Evidencia.** `docs/DECISIONES.md` (D62–D69, P14–P15), `docs/ARQUITECTURA.md` (rutas y «Sesión y cuentas»), `src/api/`
(`cliente`, `almacenSesion`, `errores`, `url`), `src/services/{sesionService,formulariosAcceso}.ts`, `src/context/{SesionContext,sesionReal,contextoReal}`,
`src/db/{nombreBase,expo}.ts`, `src/components/{NavegacionRaiz,formularios/FormularioAcceso,CampoTexto}.tsx`, `app/{_layout,login,registro}.tsx`,
`app/(app)/` (las rutas de antes + `_layout` + `(tabs)/cuenta`), `__tests__/{api,app,components,context,db,helpers,services}`.

**Validación (resultados reales).**

- `npm run check` termina con código 0: `tsc`, `eslint --max-warnings 0`, Prettier, Jest **54 suites / 537 pruebas**, hook 31/31 y contraste AA.
  Cobertura: `src/api` 100 % en sentencias, funciones y líneas (97,8 % en ramas); `src/services` 99,3 % / 95,5 % en ramas.
- `npx expo export --platform android` compila con la estructura de rutas nueva (bundle Hermes de 5,7 MB).
- **Bloqueo de rutas con el router real** (`expo-router/testing-library`): sin sesión se abre el login aunque se pida por enlace una ruta
  privada; con sesión no existen `login` ni `registro`; al expirar la sesión se pasa de lo privado al login.
- **Mutaciones:** (a) renovar sin compartir la renovación hace fallar 1 prueba; (b) reintentar en bucle tras el 401 también falla 1; (c) dejar
  `guard={true}` en las rutas privadas hace fallar 3 pruebas del router. Las pruebas del cliente y del servicio pasaron a la primera, por eso
  hice estas mutaciones para comprobar que no eran pruebas vacías.
- **Límites (importantes):** **nada se ha ejecutado en un teléfono.** No probado: `expo-secure-store` real, `deleteDatabaseAsync` y la base por
  usuario en Android, `Stack.Protected` fuera de Jest, el teclado y autocompletar de contraseñas, TalkBack en los formularios, ni la conexión
  real app ↔ API (la API tampoco se ha corrido contra los emuladores). El cliente HTTP se probó solo con dobles de `fetch`.
  Pendientes de producto: P14 (sin recuperar contraseña ni «mostrar contraseña») y P15 (HTTP bloqueado en el APK).

**Decisión.** Brayan eligió `Stack.Protected` con grupos, dos pantallas de acceso, pestaña «Cuenta» y **borrar la base antigua al arrancar**
(D62; yo recomendaba ignorarla: lo implementé tal cual y dejé el riesgo escrito). Detalles de la IA, revisables, en D66–D69.

### Casos en que se corrigió o se rechazó a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 33 | Mi primera prueba del bloqueo de rutas falló en las 3 pruebas «sin sesión» | Era un error **de la prueba**, no del código: sin `(app)/_layout` el grupo no es un navegador y sus rutas quedan sueltas en la raíz, fuera de `Stack.Protected` | **Corregida** la prueba (añadí el layout del grupo, que en la app real sí existe) |
| 34 | Escribí un hook `useUsuario()` que lanza error si no hay usuario | Razoné (sin reproducirlo) que al cerrar sesión una pantalla privada aún montada podría renderizar con `usuario = null` y tumbar la app | **Lo quité**; las pantallas usan `useSesion()` y toleran `null`. Es prevención, **no verificada en un teléfono** |
| 35 | `crearClienteApi` de 58 líneas, `CampoTexto` con complejidad 12 y una prueba de 395 líneas | ESLint rechazó las tres cosas (límites 50, 10 y 300) | **Refactor**: renovador extraído, `entradaLiteral` y pruebas divididas; no se apagó ninguna regla |
| 36 | Pruebas del cliente y del servicio verdes a la primera | Sospechoso: podían no comprobar nada | **Tres mutaciones** del código (ver arriba): las tres detectadas |
| 37 | Recomendé ignorar la base antigua | Brayan prefirió borrarla al arrancar (D62) | **Se hizo lo que decidió él**; riesgo anotado en D62 |

## 2026-11-15 · Sesión 7 · Hito 3 (parte 2): sincronización en la app

**Propósito.** Sincronizar lotes y labores con la API (sección 9.3): enviar lo pendiente, pedir lo nuevo con `?since=`, resolver conflictos,
avisar de lo que el servidor rechaza y mostrarlo al usuario. Sin fotos (P11). Además, a petición expresa de Brayan, crear `.env.local`
con `EXPO_PUBLIC_API_URL` (la IP de su PC en la Wi‑Fi). Sin comandos de git.

**Evidencia.** `docs/DECISIONES.md` (D71–D77, P16–P17; P4 cerrada), `docs/ARQUITECTURA.md`, `src/services/{sincronizacionService,red}.ts`,
`src/services/sync/{enviar,recibir,errores,esquemasRemotos,ejecutorUnico,tipos}.ts`, `src/repositories/{estadoSyncRepository,loteRepository,laborRepository}.ts`,
`src/db/{migraciones,modelo}.ts` (migración 2), `src/context/{SincronizacionContext,sincronizacionHooks,redReal,sesionReal,CuadernoContext}`,
`src/components/{AvisoDeSync,PanelSincronizacion,FilaLote,FilaLabor,DetalleLote}.tsx`, `app/(app)/{_layout,(tabs)/cuenta}.tsx`,
`__tests__/helpers/{servidorFalso,dispositivo,montarSincronizacion}`, `__tests__/{services,repositories,context,components,app,db}`.

**Validación (resultados reales).**

- `npm run check` termina con código 0: `tsc`, `eslint --max-warnings 0`, Prettier, Jest **67 suites / 642 pruebas**, hook 31/31 y contraste AA.
  Cobertura: `src/api` 100 % / 97,8 % ramas; `src/services` 99,4 % / 95,7 %; `src/repositories` 100 % / 83,3 %.
- `npx expo export --platform android` compila con `expo-network` y las rutas nuevas (bundle Hermes de 5,7 MB).
- **Servidor falso** (`__tests__/helpers/servidorFalso.ts`) que reproduce el contrato de la API que escribí (409 de nombre, 400 de lote inexistente,
  `since` inclusivo, 404 al borrar lo inexistente, páginas de 500, borrado lógico) y **dos «teléfonos»** con reloj y ids propios: se probó
  subida, bajada, paginación (501 elementos), conflictos, avisos, cortes a mitad de camino y reintento al volver la red.
- **Mutaciones (4, todas detectadas):** dar por enviado sin comparar `updated_at` (2 pruebas rojas), recibir pisando lo pendiente (2), disparar la
  sincronización con cualquier refresco, que la haría entrar en bucle (1), e intentar sincronizar sin red (1).
- **Límites (importantes):** **nada se ha ejecutado en un teléfono ni contra la API real.** El servidor falso refleja *mi lectura* del código de
  la API: si esa lectura está mal, las pruebas pasan igual. No probado: `expo-network` real, la base de datos real durante la sincronización
  (P17), `Stack.Protected` fuera de Jest, la API desplegada o contra los emuladores. Las fotos no se suben. La «última escritura gana» es por
  orden de llegada (P16).

**Decisión.** Brayan eligió sincronización automática + botón (D71), `expo-network` (D72) y marcar el 409 con aviso (D73), las tres como
yo recomendaba. Las reglas de la vuelta, la migración, la validación de lo que llega y los fallos son míos y revisables (D74–D77).

### Casos en que se corrigió o se rechazó a la IA

| # | Propuesta o afirmación de la IA | Qué se encontró | Decisión |
|---|---|---|---|
| 38 | El resumen de una vuelta con 501 lotes contaba 502 recibidos | Con `since` inclusivo, el último elemento de la página 1 vuelve al inicio de la 2 y se aplicaba dos veces (los datos estaban bien; el recuento no) | **Corregido en el código** (se salta el elemento repetido en el borde); no se relajó la prueba |
| 39 | Diseño inicial: sincronizar cada vez que cambia la versión de datos | Habría entrado en bucle: la sincronización escribe y eso la volvería a disparar | **Dos contadores** (`invalidar` = usuario, `refrescar` = sincronización); la mutación que lo deshace hace fallar la prueba de «sin bucle» |
| 40 | Mi script de edición se aplicó a medias | Cambió un esquema pero no el archivo que lo importaba: **31 pruebas rojas** hasta que lo vi | **Corregido a mano**; desde entonces verifico cada reemplazo con una aserción y re-ejecuto las pruebas |
| 41 | Prueba del 409 esperaba 2 lotes locales | Eran 3: el lote del otro teléfono también baja (y convive con el que tiene aviso) | **Corregida la prueba** (el comportamiento era el decidido en D73) |
| 42 | `SincronizacionProvider` de 105 líneas y una prueba de 316 | ESLint (límites 50 y 300) | **Refactor**: tres hooks y un ayudante de pruebas; ninguna regla apagada |
| 43 | `.env.local` | `AGENTS.md` prohíbe a la IA crear `.env*`; Brayan lo pidió expresamente en su mensaje | **Excepción puntual por instrucción expresa** (como D45): solo contiene la URL pública; no lo leí después. Una IP de Wi‑Fi cambia: puede hacer falta editarlo |
| 44 | «Todas las pantallas funcionan» (las pruebas pasaban) | **Falso:** al abrir la app en Expo Go por primera vez la pantalla de login se veía en blanco. `Pantalla` usa el `SafeAreaView` de `react-native-safe-area-context`, que NativeWind v5 no envuelve: su `className` se ignoraba y el `ScrollView` interno (`flex-1`) quedaba sin altura. Jest no calcula estilos, por eso nunca lo vio. Lo encontré leyendo `react-native-css` (resolvedor de Metro y componentes envueltos) | **Corregido** con `styled(SafeAreaView)` (D78) y una prueba que vigila el patrón (roja con el código original). **No confirmado en el teléfono** hasta que Brayan recargue |
| 45 | «Con `styled` la pantalla ya está bien» | Parcialmente: en el A35 se vio el login, pero los mensajes de error salían **sin icono** y apareció «Uncaught (in promise) TypeError: Cannot read property 'getAssetByID' of undefined». Con `adb logcat` encontré el mensaje; el origen era `react-native-css 3.1.0-rc.1`, que no exporta `AssetRegistry` y rompe `expo-asset` (fuentes de los iconos). Ni Jest ni `expo export` lo detectaban: solo falla al ejecutar | **Corregido** con la excepción D79 (Brayan eligió la opción); verificado en el bundle: `expo-asset` pasó de recibir `react-native-css/components` a recibir el `react-native` real. **Pendiente de confirmar en el teléfono** tras reiniciar Metro con `-c` |

## 2026-11-15 · Sesión 8 · Primera prueba en dos teléfonos reales (A35 y Redmi A2)

**Propósito.** Recorrer todas las funciones construidas en un Samsung A35 y un Redmi A2 (Expo Go, contra la API y los emuladores de Firebase de Brayan),
con su permiso expreso para observar y manejar ambos por `adb`. Cuenta de prueba `brayanald02@gmail.com`, creada en el A35 y abierta en el A2. Sin git.

**Cómo.** `adb` + volcado de jerarquía (`uiautomator dump`) para leer y tocar, capturas, `logcat` para errores de JavaScript, `svc wifi`/`cmd uimode` para
red y tema; la API se consultó con un script de Node (`servidor.mjs`, fuera del repo) para comprobar lo que de verdad llegó al emulador de Firestore.
El selector de galería del sistema mostró fotos personales de Brayan: solo se eligió la imagen de prueba que yo copié (y se borró después).

**Resultados que pasan en los teléfonos.**

- **API real contra emuladores:** `scripts/humo.mjs` 20/20 (primera vez que corren el adaptador de Firestore, Auth REST y `verifyIdToken`).
- **Cuenta:** registro, login, contraseña incorrecta («Correo o contraseña incorrectos.»), correo repetido («Ese correo ya está registrado.»), validaciones, segunda cuenta con
  base separada (lista vacía), cerrar sesión y volver a entrar conservando los datos, **restauración de la sesión en arranque en frío** (A2).
- **Criterios de aceptación:** 1 (**«El Mirador — 90 días»**), 2 (**«Total: 23,85 kg»** con 3 cosechas, también calculado por el servidor) y 3 (GPS real: 1616 m y el aviso de que
  no hay barómetro; ninguno de los dos teléfonos lo tiene).
- **Funciones:** lotes (crear, validar, editar, borrar en cascada con confirmación), calendario nativo limitado a hoy, permiso de ubicación solo al pulsar, labores (los 5 tipos, cantidad,
  luz, nota, editar, borrar con confirmación), duplicar con **mantener presionado** y con botón, deslizar entre lotes (+ botones), buscadores de lotes y de labores, próximas labores (RF-03),
  foto desde la galería, visor con zoom por botones, tema claro y oscuro.
- **Sincronización:** al abrir, tras un cambio (3 s), al volver la red y al volver a la app; en los dos sentidos A35↔A2; borrados (labor y lote en cascada); **conflicto 409**
  (lote «Duplicado» creado en los dos teléfonos: el local queda con «Sin sincronizar…», renombrarlo lo sincroniza solo); sin red alcanzable el panel dice «Sin conexión: tus cambios se enviarán cuando vuelva».

**Hallazgos (defectos y dudas).**

| # | Qué se vio | Gravedad |
|---|---|---|
| H1 | El arrastre del control de cantidad **no arranca si empieza sobre el propio número** (el campo de texto capta el toque); sí funciona desde el resto de la caja. La ayuda dice «sobre el número» | Media |
| H2 | «Última sincronización» **no se actualiza** al sincronizar sin cambios (se vio en los dos teléfonos: seguía en 13:05 siendo las 13:07) | Media |
| H3 | Cantidades con punto en las filas («8.25 kg») y con coma en el total («23,85 kg») | Baja |
| H4 | `DateTimePicker: onChange is deprecated` (usar `onValueChange`/`onDismiss`) | Baja |
| H5 | En el **Redmi A2** (1,8 GB) Android cerró la app en segundo plano y volvió a Expo Go; al reabrirla restauró la sesión y sincronizó bien | Informativa |
| H6 | Un deslizamiento hacia la derecha empezado a ~13 % del borde izquierdo no cambió de lote (posible choque con el gesto de volver; P12). Desde más adentro sí | Por confirmar |
| H7 | La pestaña «Labores» tiene más margen lateral que «Lotes» | Baja |
| H8 | El login conserva lo escrito y el error al volver desde «Crear cuenta» | Baja |

**No probado.** Pellizco de dos dedos (con `adb input` solo hay un dedo), TalkBack, arranque sin conexión (Expo Go necesita Metro), renovación del token al caducar (1 h), subida de fotos
(no implementada, P11), cámara, notificaciones y segunda capacidad (P1: no construidas).

### Cierre de los hallazgos H1–H8 (misma sesión)

| # | Resultado | Verificación |
|---|---|---|
| H1 | Corregido (D80). **Mi primer intento fue erróneo:** `pointerEvents="none"` sobre el `TextInput` pasaba en Jest y no tenía efecto en Android; en el teléfono el arrastre seguía fallando. Se corrigió envolviendo el campo en un `View` | A35: arrastre sobre el número 0→2→1, sin teclado; toque simple abre el teclado |
| H2 | Corregido | A35: «Última sincronización» 13:47 → 13:49 al sincronizar sin cambios |
| H3 | Corregido (coma decimal) | A35: «5,1 kg», «8,25 kg», total «23,85 kg» y control «5,1» |
| H4 | Corregido (`onValueChange`) | A35: elegir y cancelar bien; 0 avisos de «obsoleto» en el registro |
| H5 | **No era un fallo:** fue mi método (`monkey` abría la portada de Expo Go). Con `am start` de la actividad del proyecto el A2 conservó la app | A2: Lotes intacto tras 20 s en segundo plano; ~342 MB de PSS con 760 MB libres |
| H6 | **No se reproduce:** 12 de 12 deslizamientos correctos con 3 lotes, incluso desde x=140. Solo la franja del borde (~36 dp) la toma Android como «volver» | A35 |
| H7 | Corregido (`relleno`): era doble margen | A35: campos de búsqueda de Lotes y Labores con los mismos bordes |
| H8 | Corregido (`useReiniciarAlSalir`) | A35 y A2: con correo, contraseña y el error «Correo o contraseña incorrectos.» en pantalla, ir a «Crear cuenta» y volver deja los dos campos vacíos y sin error |

**Pruebas de esta tanda:** `npm run check` con código 0 (72 suites, 672 pruebas, hook 31/31, contraste AA) y `expo export` compila (5,7 MB).
**Error mío:** dos «atrás» sacaron al A35 de la app y varios deslizamientos de la prueba H6 cayeron en la pantalla de inicio de Samsung (solo cambiaron de página; no se abrió nada). Se añadió la protección D82.
**Verificación en el Redmi A2 (completada):** H7 (bordes idénticos `[27,220][693,303]` en Lotes y Labores), H3 (filas «8,25 kg» y «10,5 kg», control «5,1»), H1 (arrastre sobre el número 5,1 → 7,1 sin teclado; un toque lo abre), H4 (aceptar fija el 10, cancelar no cambia, 0 avisos de «obsoleto»), H2 («Última sincronización» 15:28 → 15:31 sin cambios; el reloj del A2 va ~13 min atrás del PC) y H8. **Todo H1–H8 queda verificado en teléfonos reales.**
**Incidente de la verificación:** mi primer script usó coordenadas equivocadas de las pestañas del A2 y sus «atrás» finales sacaron la app; la protección D82 frenó los gestos en el launcher. Se rehízo paso a paso comprobando la pantalla en cada uno. Lección: nada de scripts ciegos con «atrás».

## 2026-11-15 · Sesión 9 · Subida de fotos a la API (P11)

Propósito: que la foto de una labor se reduzca, se guarde de forma permanente en el teléfono, suba a la API con la sincronización y se
borre del servidor cuando deje de usarse. Brayan eligió las tres decisiones con pros y contras (D83 reducir + copia permanente, D84 con
la sincronización y cualquier red, D85 borrar del servidor); los detalles delegados están en D86.

Evidencia: `src/api/cliente.ts` (cuerpo binario), `src/services/fotos.ts` (puerto `PuertoFotos`), `src/context/fotosReal.ts`,
`src/db/migraciones.ts` (migración 3, `fotos_por_borrar`), `src/repositories/fotoRepository.ts`, `src/services/sync/fotos.ts` y
`enviar.ts`, `laborService.ts` / `loteService.ts` (encolar borrados), `useGaleria.ts`, `FilaLabor.tsx`, `VisorFoto.tsx`,
`app/(app)/foto/[id].tsx` y las pruebas nuevas (`clienteBinario`, `fotoRepository`, `fotosServicios`, `sincronizacionFotos`, `fotoRemota`).
Dependencias nuevas, avisadas antes de instalar: `expo-image-manipulator` (existencia, licencia y versión comprobadas con `npm view`) y
`expo-file-system` (paquete oficial de Expo, versión del SDK 58).

Validación:
- `npm run check` con código 0: 77 suites, 706 pruebas, hook 31/31, contraste AA. `expo export --platform android` compila.
- **Samsung A35:** elegir una imagen de 3200×2400 → vista previa (comprobada por color: es mi imagen de prueba) → registrar la labor → en el
  servidor la labor trae `foto_url`; quitar la foto → `foto_url` null; poner otra y cambiarla → URL distinta cada vez; borrar la labor →
  `deleted_at` en el servidor; «Todo está sincronizado» y sin errores de JavaScript en `logcat`.
- **Redmi A2:** al sincronizar recibe la labor con foto y muestra «Foto no disponible» (la API local usa un doble de Blob que no guarda
  nada: `https://blob-local.invalid/…`); elegir la foto grande y verla en la vista previa tarda ~6 s incluyendo el selector; la labor sube
  con su `foto_url` y se borra bien.
- **No comprobado:** que otro teléfono VEA la foto (necesita un Blob real, P11); el borrado real de la imagen en Blob (el doble responde
  bien pero no guarda nada: lo cubren las pruebas con el servidor falso); fotos de varios MB en cobertura móvil.

Decisión: la foto se reduce una sola vez (el selector va con calidad 1); una labor con foto por subir no se envía hasta que su foto suba;
una foto perdida o rechazada (413/415) deja solo esa labor con aviso.
Rechazos/correcciones: al registrar la labor en el A35 la vista previa desapareció una vez, tras un deslizamiento mío que empezó sobre el
botón «Quitar foto» (probablemente lo activó); repetido sin ese gesto la vista previa se mantiene. Para elegir la imagen en el selector
se usó solo la que yo subí (la más reciente por fecha) y se comprobó por color, sin abrir ni mirar las fotos de Brayan; las imágenes de
prueba se borraron de los dos teléfonos y la labor de prueba del A2 se borró desde la app.
Pendiente: `AGENTS.md` de la app aún no lista `expo-image-manipulator`, `expo-file-system`, `expo-network`,
`@react-native-community/datetimepicker` ni `expo-sensors` (lo añade Brayan).

## 2026-11-15 · Sesión 10 · Segunda capacidad (P1): sensor de luz y cámara

Propósito: cumplir la segunda capacidad obligatoria. Brayan eligió «Ambas» (luz y cámara) y, antes, el margen inferior de 16 dp (D87).

Evidencia: `src/sensors/{luz,medirLuz}.ts`, `src/components/formularios/{MedidorLuz,useMedidorLuz,ModalCamara,SeccionFoto}.tsx`,
`src/hooks/{useCamara,useInsetInferior}.ts`, `app.json` (plugin de cámara) y las pruebas `luz`, `medirLuz`, `MedidorLuz`, `camara`, `insetInferior`.
Dependencia nueva, avisada antes: `expo-camera` (npm view: 58.0.14, MIT, mantenida).

Validación:
- `npm run check` con código 0: 82 suites, 735 pruebas.
- **Redmi A2:** cámara con permiso concedido → vista previa → «Tomar foto» → vista previa en el formulario (~5 s) → la labor sube con su `foto_url`
  → se borra. Sensor de luz: existe pero no emitió lecturas en 4 s; salió el aviso «No se obtuvo una lectura…» y el selector manual sigue.
- **Samsung A35:** NO probado en esta tanda: perdió la conexión `adb` (no aparece en `adb devices`). Pendiente de Brayan reconectarlo.
- No se miraron imágenes de la cámara: la vista previa apuntaba al entorno de Brayan; solo se leyó la interfaz con `uiautomator`.

Rechazos/correcciones (míos):
1. Mi primer `useLuz` hacía `setState` dentro de un efecto y `MedidorLuz` pasaba de 50 líneas; el linter lo rechazó. Se rehízo sin efectos: una función `medirLuz` (una medición con `AbortSignal`) y un hook de estado.
2. Usé `CameraView.isAvailableAsync()` como en los sensores: en Android no existe (solo web) y mi código lo tomó como «sin cámara» en el A2. Se corrigió (se da por hecha y se avisa con `onMountError`) y se añadió una prueba.
3. El primer test de captura agotó los 5 s con Jest en paralelo (aislado pasa): se subió el tiempo máximo de ese archivo.

## 2026-11-15 · Sesión 11 · Recordatorio de riego (RF-06)

Propósito: avisar cuando toca regar cada lote con una notificación local. Brayan eligió «automático por lote» y «hora elegible en Cuenta».

Evidencia: `src/services/{planRecordatorios,recordatoriosService,notificaciones}.ts`, `src/context/notificacionesReal.ts`,
`src/repositories/ajusteRepository.ts` (+ `listarRiegosVivos`), migración 4, `src/hooks/useRecordatorios.ts`,
`src/components/{PanelRecordatorios,CampoHora,ReprogramadorDeRecordatorios}.tsx` y las pruebas `planRecordatorios`, `recordatoriosService`,
`recordatorios`. Dependencia nueva, avisada antes: `expo-notifications` (npm view: 58.1.9, MIT, mantenida; `expo install`).

Validación:
- `npm run check` con código 0: 85 suites, 778 pruebas.
- **Redmi A2 (Android 13):** al encender sale el diálogo de permiso del sistema → se aceptan → alarmas `RTC_WAKEUP` del sistema por lote
  (`dumpsys alarm`); con un lote de prueba de riego vencido (creado por la API y borrado después) la notificación «Hora de regar: Prueba riego
  vencido — El riego venció el 4 de noviembre de 2026.» apareció a la hora fijada (17:45). Al apagar, 0 alarmas.
- **Samsung A35:** con Expo Go el permiso aparece «denegado» (`canAskAgain: false`) aunque Android lo conceda por `pm grant`: Expo Go lleva su
  propio registro. Se verificó el mensaje de ayuda y el botón «Abrir ajustes del teléfono». También en el A35: sensor de luz = 51 lx → «Nublado»
  y cámara (vista previa en ~3 s), que quedaban pendientes de la sesión 10.
- **No probado:** el aviso real en el A35 y en el APK (hay que repetirlo sin Expo Go), Doze/ahorro de batería en uso real, avisos tras reiniciar el teléfono.

Rechazos/correcciones (míos):
1. `setNotificationChannelAsync` falló en el A35 con un `NullPointerException` nativo y la pantalla solo decía «No se pudo cambiar…»: lo vi solo al
   registrar el error temporalmente (ya quitado). Crear el canal ya no es fatal.
2. Metro dio 500 porque no vio el paquete recién instalado (hubo que reiniciarlo con `-c`, lo hizo Brayan).
3. Mis toques al restablecer el A2 cayeron en el formulario de labor (la pantalla no era la que supuse); comprobé en el servidor que no se creó nada.
4. Quedó la hora del A2 en 07:45 (mi último toque en el reloj) y los recordatorios apagados.

## 2026-11-16 · Sesión 12 · La app apunta a producción

Propósito: cambiar la app del emulador local a la API desplegada en Vercel (Firebase y Blob reales).

Evidencia: `.env.local` de la app (creado por Brayan como excepción a la regla de `.env*`) con `EXPO_PUBLIC_API_URL=https://cuaderno-agricola-api-brayans-projects-fe0e6f44.vercel.app`;
Brayan reinició Metro con `-c`; el bundle trae la URL nueva y ninguna IP local.

Validación (Redmi A2): la sesión del emulador dejó de valer y la app mostró el login; registré la cuenta de prueba `prueba.campo@example.com`
(con una contraseña de prueba; el teclado de `adb` descartó un carácter especial que quise poner), creé el lote «Finca produccion» y una labor de riego con foto de mi imagen
de prueba. En producción llegaron el lote, la labor y la foto: la URL del Blob responde 200 con un JPEG de 82 KB (reducido desde 456 KB).
**No probado:** ver esa foto en otro teléfono (el A35 estaba desconectado de `adb`), notificaciones y cámara contra producción, y el APK.

Nota: la imagen de prueba quedó en la galería del A2 (`cuaderno_prueba_prod.jpg`) y en el Blob real; hay que borrarlas al terminar las pruebas.

## 2026-11-16 · Sesión 13 · Preparación del EAS Build (P9)

Propósito: dejar el proyecto listo para compilar el APK con EAS. Brayan eligió el identificador `com.cuadernoagricola.app` y pidió generar el icono y el splash con el artefacto de Claude Design.

Evidencia: `app.json` (package, versionCode, icono, icono adaptativo, plugins de notificaciones y splash), `eas.json` (perfil `preview`), `assets/{icon,adaptive-icon,splash-icon,notification-icon}.png`
y la lámina de diseño (artefacto privado «Icono y splash del Cuaderno»). Dependencias nuevas, verificadas con `npm view`: `expo-splash-screen` y `expo-font`.

Validación: `expo-doctor` 20/20 (la primera pasada marcó 1 fallo: faltaba `expo-font`; **sin ella el APK habría podido cerrarse al arrancar**, algo que Expo Go no muestra),
`npm run check` verde (85 suites, 778 pruebas) y `expo export --platform android` compila. **No probado:** el build en sí (lo lanza Brayan: la IA no usa `eas`) ni la instalación del APK.

Rechazos/correcciones (míos): el icono se genera con Pillow, no con el lienzo de diseño (que no exporta PNG): repliqué la geometría a mano; el icono se revisó a ojo y la unión de la vena con el rabito queda algo brusca (retoque opcional).

## 2026-11-16 · Sesión 14 · Contraseña: mostrar, confirmar y recuperar (P14)

Propósito: que un error al teclear la contraseña no deje la cuenta inaccesible y que se pueda recuperar. Brayan eligió «mostrar contraseña + confirmación» y «recuperar por correo» (ambas).

Evidencia (app): `CampoTexto` (botón mostrar/ocultar), `formulariosAcceso.ts` (confirmación y `esquemaRecuperar`), `FormularioAcceso`/`FormularioRecuperar`, `app/recuperar.tsx`,
enlace en `app/login.tsx`, `cliente.recuperarPassword`, `sesionService`, `SesionContext` y sus pruebas. Evidencia (API): ruta `POST /api/auth/recuperar` (puerto, adaptador REST,
servicio, manejador, esquema) con pruebas; redespliegue en Vercel.

Validación: app `npm run check` verde (86 suites, 807 pruebas); API 142 pruebas. **Producción:** `/api/auth/recuperar` → 200 `{ok:true}` para una cuenta existente y para una
inexistente, 400 con correo inválido o cuerpo no JSON. **Redmi A2:** el login muestra «Mostrar la contraseña» (campo `••••••••` ↔ texto real y de vuelta), el registro pide
«Repite la contraseña», y desde «¿Olvidaste tu contraseña?» se pide el enlace y sale el aviso «Si ese correo tiene una cuenta…».
**No probado:** que el correo llegue de verdad y que el enlace funcione (la cuenta de prueba usa `example.com`, sin buzón), el aspecto del correo y el A35.

Rechazos/correcciones (míos): la etiqueta del ojo salió «Mostrar Repite la contraseña» (confuso para TalkBack): se añadió `secretoDe` («Mostrar la confirmación»); dos componentes
pasaron de las 50 líneas del linter y se dividieron.

## 2026-11-16 · Sesión 15 · Primer APK con EAS Build

Propósito: compilar el APK, instalarlo y repetir en él lo que Expo Go no permitía. Brayan pidió expresamente que la IA lanzara el build (la regla de `AGENTS.md` la prohíbe por defecto; la configuración no lo bloqueó).

Evidencia: `eas init --account aldanam4r` (proyecto `@aldanam4r/cuaderno-agricola`, commit «Vincula el proyecto con EAS»), `eas build -p android --profile preview`
(keystore generado por EAS; build `381c99a3-…`, 20:14 → 20:46, 118 MB). APK instalado por `adb install` en el Redmi A2 (paquete `com.cuadernoagricola.app`).

Validación (Redmi A2, APK sin Metro): arranca sin cierres (`logcat` sin `FATAL EXCEPTION`); los iconos cargan (el arreglo de `expo-font` funcionó); login con una cuenta temporal de
producción; **notificaciones: sale el diálogo de permiso del sistema, se concede y el interruptor queda activo** (en Expo Go no se podía); **arranque sin conexión: con modo avión
la app abre directamente en «Lotes»** (sesión restaurada sin red). Tras la prueba se desactivó el modo avión.
**No probado:** el A35 (sin `adb` en esta tanda), cámara y luz en el APK, el aviso real de riego (sin lotes vencidos en la cuenta temporal) y la foto entre teléfonos.

Notas: la descarga con `fetch` de Node se cortó (`ECONNRESET`); funcionó `Invoke-WebRequest`. Al iniciar sesión Android ofrece guardar la contraseña en Google (por los `autoComplete`). La cuenta
de prueba anterior (`prueba.campo@example.com`) ya no existía (la borró Brayan); se creó `apk.prueba@example.com`, que conviene borrar al final.

## 2026-11-16 · Sesión 16 · README y pruebas finales

Propósito: README de los dos repositorios y las pruebas finales de la lista de verificación (cobertura, secretos, permisos, accesibilidad).

Evidencia: `README.md` de la app (capturas en `docs/capturas/`, tomadas del APK en el A2 con datos de ejemplo en una cuenta temporal) y de la API; `app.json` (`blockedPermissions`);
`PanelRecordatorios` (fila tocable).

Validación:
- **Cobertura:** app 98,6 % de sentencias y 93,7 % de ramas (807 pruebas); API 97,9 % y 92 % (142 pruebas). Umbral del proyecto: 80 %.
- **Auditoría de secretos:** `git grep` sobre lo versionado y búsqueda de patrones (clave PEM, `AIza…`, token de Blob, cuenta de servicio, `firebaseConfig`, contraseñas de prueba, IP local) dentro del
  APK descomprimido (`index.android.bundle`, `classes.dex`, `resources.arsc`, manifiesto): solo aparece la URL pública de la API. Antes se había colado una contraseña de prueba en esta bitácora (ya quitada).
- **Permisos:** el APK pedía de más (micrófono, superposición de pantalla, reconocimiento de actividad, biometría, push de Google): se añadieron a `blockedPermissions`. **Hay que recompilar para que surta efecto.**
- **Accesibilidad (revisión con `uiautomator`, sin TalkBack):** en lotes, detalle, bitácora, labores, nueva labor, foto y cuenta **ninguna zona tocable sin nombre**. Hallazgos: el interruptor del recordatorio medía
  27 dp (arreglado: ahora toda la fila es tocable, 48 dp) y los botones de las pestañas aparecen con 22 dp en el árbol de accesibilidad aunque su área táctil real es mayor (se comprobó tocando bajo ese borde); los
  demás «pequeños» eran controles recortados por el desplazamiento.
- `npm run check` de la app verde (86 suites, 807 pruebas).
**No probado:** TalkBack real (leer y navegar con el lector activado: se dejó como prueba manual), el A35 y el pellizco con dos dedos.

## Plantilla para próximas entradas

```text
## AAAA-MM-DD · Sesión N · <tarea pequeña>
Propósito: …
Evidencia: archivos/commits/capturas
Validación: qué se ejecutó (check, pruebas, dispositivo) y su resultado real
Decisión: qué se aceptó, qué se cambió y por qué
Rechazos/correcciones: …
```


## 2026-11-16 · Sesión 17 · Cuaderno agrícola A1–A4 (D95)
Propósito: finca y ciclos de cultivo, periodo de carencia, costos y reportes PDF/CSV.
Evidencia: migración 5, `cicloService`, `carencia`, `reporteService`, `reportesReal`, `FormularioCiclo`, pantalla `lote/ciclo/[id]`, campos nuevos en los formularios; API: recurso `ciclos` y campos opcionales.
Validación: `npm run check` en verde (849 pruebas en la app) y `expo-doctor` 20/20; API 163 pruebas. Compartir PDF/CSV solo se puede probar en un teléfono con una versión nueva del APK. El despliegue del API a producción queda pendiente de autorización.
Decisión: D95 (app) y D93 (API). Campos opcionales con `null` para clientes antiguos; carencia solo avisa.
Rechazos/correcciones: `trim()` quitaba el BOM del CSV en una prueba; el nombre de archivo convertía las tildes en guiones.
