# Skills de proyecto · revisadas antes de instalar

Una skill es una instrucción que la IA obedece, así que cada `SKILL.md` se **leyó completo** antes de instalarla y se buscó
código sospechoso en el resto de sus archivos (`curl`, `eval`, `base64`, órdenes tipo «ignora tus reglas», `@latest`).
Se instalan **por proyecto** (sin `-g`, para que vivan en `.claude/skills/` del repo y no en `~/`, que el sandbox bloquea),
con `--copy` (sin enlaces simbólicos) y desde un clon fijado a un commit, de modo que se instala exactamente lo revisado.

## Instaladas en este repositorio (app)

| Skill | Origen y commit revisado | Hash de integridad (`computedHash`) | Para qué |
|---|---|---|---|
| `expo-animation` | `expo/skills` @ `ab6cb2c58b0daa7555590d869dd1aa2ddb5d7632` | `7f28a298611a9440484836c2d02366bff5cdbe4c1c4cc2a1965ffe2eb075ffae` | Gestos y animaciones con Reanimated + Gesture Handler; movimiento reducido; objetivos táctiles |
| `expo-router` | `expo/skills` @ `ab6cb2c…` | `9c3a05a145ceec25ccca5c733b9403b03c7174c60c48c017009c2c5a1a68c8cb` | Rutas por archivos, layouts, modales |
| `expo-design-system` | `expo/skills` @ `ab6cb2c…` | `e2fe37e041433e6f73702cc7dd8e8f2736c5e6fa62ce32cccc630c5f4ce76309` | Tokens y componentes; auditoría de deriva (hex sueltos) |
| `vercel-react-native-skills` | `vercel-labs/agent-skills` @ `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` | `4c160f1f4e623b989cadb71f42a0813be574d172acf5e32a6411c87f3e28c05a` | Buenas prácticas de RN (listas, imágenes, rendimiento) |

La API instala solo `vitest` (ver su propio `ia/SKILLS.md`).

## Precauciones al leerlas (conflictos con `AGENTS.md`; manda `AGENTS.md`)

- **`expo-animation`**: su postura dice «toma la decisión, nunca presentes opciones como menú». **Aquí no aplica:** las
  decisiones técnicas fuera de la especificación se preguntan. Además da por hecho un *release build* para juzgar el rendimiento.
- **`expo-router`**: promueve `NativeTabs` (`expo-router/unstable-native-tabs`) y `Link.Preview`, funciones pensadas para iOS
  e inestables. **No usar APIs `unstable_*` sin preguntar**; el objetivo es Android.
- **`expo-design-system`**: propone tokens con `Color` nativo de la plataforma y SF Symbols. **Aquí los tokens son
  `src/theme/palette.json` (paleta del proyecto)**; no crear un segundo sistema de tokens.
- **`vercel-react-native-skills`**: sugiere paquetes extra (`FlashList`, `expo-image`, `Galeria`). **Cada dependencia nueva se
  pregunta y se justifica en el README.**
- Todas terminan con un bloque «Submitting Feedback» que ejecutaría `npx --yes @expo/agent-cli@latest feedback …`.
  **Prohibido ejecutarlo** (código sin versión fija y envío de datos del proyecto).

## Revisadas y rechazadas

| Skill | Motivo |
|---|---|
| `expo-overview` | Ordena ejecutar `npx --yes @expo/agent-cli@latest …` en lugar de `npx expo` e instalar con ese CLI sin versión fija; manda consultar `@expo/ui`. Choca con las reglas de dependencias y con NativeWind |
| `expo-data-fetching` | Empuja a React Query/SWR; la decisión D4 es hooks propios + Context |
| `firebase-auth-basics`, `firebase-firestore` (solo en la API) | Empujan al SDK de cliente, `firebase deploy` y bases Enterprise en la nube; contradicen Admin-SDK-solo, el emulador y «nada con efecto afuera sin permiso» |
| `expo-tailwind-setup`, `expo-deployment` | Ya no existen con ese nombre en el repositorio actual; NativeWind y EAS se configuran con su documentación oficial |

## Reproducir la instalación

```bash
git clone https://github.com/expo/skills && git -C skills checkout ab6cb2c58b0daa7555590d869dd1aa2ddb5d7632
DISABLE_TELEMETRY=1 npx skills add ./skills -s expo-animation -s expo-router -s expo-design-system -a claude-code --copy -y
```

(El `skills-lock.json` que genera la herramienta guardaba una ruta absoluta de la máquina, por eso no se versiona.)
Comprobar que cargan dentro del sandbox: pendiente de WSL2 (`/skills` o pedir a la IA que liste sus skills).
