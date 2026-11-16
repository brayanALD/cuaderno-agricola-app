# Configuración de IA · qué riesgo cubre cada barrera

Herramienta: **Claude Code**. Se abre **siempre en la raíz de este repositorio, dentro de WSL2** (nunca en una carpeta
padre). Sintaxis verificada contra la documentación oficial (code.claude.com: settings, permissions, sandboxing, hooks).
Estado de verificación: ver la columna «Evidencia». Lo marcado **PENDIENTE** requiere WSL2 y aún no se ha ejecutado.

## Capas (se combinan porque ninguna basta sola)

| # | Barrera | Dónde | Riesgo que cubre | Límite conocido | Evidencia |
|---|---|---|---|---|---|
| 1 | Reglas del proyecto | `AGENTS.md` (+ `CLAUDE.md` = `@AGENTS.md`) | Orienta: stack, capas, prohibiciones, «ante la duda, pregunte», texto externo = dato | Es una **sugerencia**; el modelo puede ignorarla o un texto hostil anularla | Escrito a mano, ≤100 líneas |
| 2 | Secretos fuera de alcance | `permissions.deny`: `Read(**/.env*)`, `*.pem`, `*.key`, `*firebase-adminsdk*.json`, `*.keystore`, `*.jks`; `Edit(**/.env*)` | La IA lee o crea archivos con claves | Una regla `Read` no ve `grep -r` ni un script de Node: eso lo ataja la capa 4 | PENDIENTE (prueba 1–4) |
| 3 | Sin secretos reales en disco | `env.example` con valores falsos; Firebase Emulator Suite; `vercel env pull` denegado | Si no hay secretos reales, no hay qué filtrar | Exige disciplina: producción vive solo en Vercel | `env.example`; regla `deny` |
| 4 | Sandbox del SO | `sandbox.enabled`, `failIfUnavailable`, `allowUnsandboxedCommands:false`, `filesystem.denyRead:["~/"]`, `allowRead:["."]` | Comandos que leen fuera del repo, `grep -r`, `node -e` | **No existe en Windows nativo**: exige WSL2 + `bubblewrap` + `socat`. Con `failIfUnavailable` la IA ni arranca sin sandbox | PENDIENTE (`/sandbox`, pruebas 3–6) |
| 5 | Confinamiento de herramientas | `blockReadsOutsideWorkingDirectories` y `blockWritesOutsideWorkingDirectories` = `true`; sin `additionalDirectories` | `Read`/`Edit`/`Write` fuera de la carpeta | Las herramientas de archivo, no Bash (de ahí la capa 4) | PENDIENTE (prueba 5–6) |
| 6 | La IA no cambia su jaula | `deny Edit(./.claude/**)`; `disableBypassPermissionsMode:"disable"`; hook bloquea editar `.claude/` | Que la IA se dé más permisos o active `bypassPermissions` | — | PENDIENTE (prueba 9); hook: prueba 11 |
| 7 | Red mínima | `sandbox.network.allowedDomains`: ver justificación abajo | Exfiltración y descargas | Un dominio permitido sigue siendo un canal | PENDIENTE (prueba 7) |
| 8 | Acciones con efecto | `deny`: `sudo`, `rm -rf`, `curl`, `wget`, `git push --force`/`-f`, `git reset --hard`, `vercel env pull`. `ask`: **cualquier comando `git`** (regla del usuario: nada de git sin que lo pida), instalar dependencias, `npx`, `vercel`, `eas`, `firebase` | Daño irreversible o publicar sin permiso | `Bash(curl *)` **no** detiene `/usr/bin/curl` ni `sh -c '…'`: una regla de Bash no es una frontera → capas 4 y 9 | PENDIENTE (prueba 7–8) |
| 9 | Hook `PreToolUse` propio | `.claude/hooks/guard.mjs` (sale con código 2 y mensaje en `stderr`) | Bloquea `.env*`/claves, rutas fuera del proyecto, `curl`/`wget`/`sudo`/`powershell`/`pwsh`/`cmd` (también `/usr/bin/curl`, `sh -c`, `$(…)`), y editar `.claude/` | Es análisis de texto: no ve `grep -r X .` (lo cubre el sandbox) | **31/31 pruebas `node:test` pasan** (`npm run test:hooks`) |
| 10 | Modo plan por defecto | `permissions.defaultMode: "plan"` | Que la IA edite sin proponer antes | Solo el modo inicial de cada sesión | Configurado |
| 11 | Calidad automática | `npm run check` (typecheck + lint + format + test), cobertura ≥80 % con umbral, Husky + lint-staged, CI | Código de IA roto o sin pruebas llegando a `main` | — | PENDIENTE (requiere dependencias instaladas) |

Orden de evaluación de reglas: **deny → ask → allow**; una regla `allow` no abre una excepción dentro de un `deny`.

## Dominios de red permitidos (cada uno justificado)

- `registry.npmjs.org`: comprobar que un paquete sugerido existe, tiene mantenimiento y descargas reales (`npm view`).
  Instalar sigue pidiendo permiso (`ask`).
- `github.com`: `git push`, que además pide permiso (`ask`).

Nada más. No se permite `api.expo.dev` ni dominios de Firebase/Vercel: la IA no instala, despliega ni usa la nube.
Si una orden legítima falla por red, se abre **un** dominio y se documenta aquí.

## Retos de excelencia elegidos (mínimo 2)

1. **Hook `PreToolUse` propio con pruebas `node:test`** (`.claude/hooks/guard.mjs` + `guard.test.mjs`, 31 pruebas: 22 de bloqueo y 9 de no-falso-positivo). Reproducir: `npm run test:hooks`.
2. **Cero secretos reales en disco**: todo el desarrollo contra Firebase Emulator Suite, con script que siembra datos
   (repo API, `scripts/`). Producción solo en Vercel. Reproducir: `grep -r` sobre el repo y revisar el bundle.

Candidato a tercer reto si hay tiempo: escaneo de secretos con `gitleaks` en pre-commit y CI.

## Ajustes hechos (qué falló y cómo se corrigió)

- **Hook, ruta fuera del proyecto**: la prueba 04 falló. El filtro «la ruta absoluta debe existir», pensado para evitar falsos
  positivos en Bash (`/api/auth` es un patrón, no una ruta), también se aplicaba a `Read`/`Write`; como `Write` crea
  carpetas padre, escribir en una carpeta externa inexistente pasaba. Se separó el modo estricto para las herramientas de archivo
  y se agregó la prueba `12b`. Resultado: 27/27 en ese momento (hoy 31/31).
- **Orden de trabajo**: `.claude/settings.json` se recarga en caliente; se escribió al final de la preparación para no
  bloquear la propia sesión de configuración.

## Skills (instrucciones que la IA obedece: se revisó cada `SKILL.md` antes de instalar)

Instaladas por proyecto (sin `-g`) desde un clon fijado a un commit revisado. Detalle, hashes y rechazadas con motivo en `ia/SKILLS.md`.
Si una skill contradice `AGENTS.md`, manda `AGENTS.md`.

## Modo temporal en Windows, sin sandbox (decisión del usuario, 2026-11-14 · D13)

**Motivo.** WSL2 no se pudo instalar: `VirtualMachinePlatform` es una característica bajo demanda que Windows no logra descargar
de Windows Update (ver `docs/FASE0-WSL.md`) y el plazo es de 7 días. Brayan decidió avanzar en Windows y migrar a WSL2 cuando
sea posible. Esto **incumple temporalmente** la hoja (sandbox obligatorio) y por eso queda declarado aquí y en la bitácora.

**Cómo se hizo.** La excepción vive en `.claude/settings.local.json` (no versionado; `.gitignore` lo excluye):
`sandbox.failIfUnavailable: false` y `permissions.deny: ["PowerShell"]`. El `.claude/settings.json` compartido sigue **estricto**.
Al migrar a WSL2 basta **borrar el archivo local** y todo vuelve a exigir sandbox.

| Capa | En modo Windows |
|---|---|
| 1 reglas `AGENTS.md` | activa |
| 2 secretos (`deny Read/Edit .env*`, claves) | activa |
| 3 sin secretos reales en disco | activa |
| 4 sandbox del SO | **AUSENTE** (no existe en Windows nativo) |
| 5 `blockReads/Writes OutsideWorkingDirectories` | activa (solo herramientas de archivo) |
| 6 la IA no cambia su jaula | activa |
| 7 red mínima | **AUSENTE** (depende del sandbox) |
| 8 `deny`/`ask` (incluye cualquier `git`) | activa para la herramienta Bash; la herramienta **PowerShell** queda denegada |
| 9 hook propio | activa; ahora también bloquea `powershell`, `pwsh` y `cmd` |
| 10 modo plan | activa |

**Hueco hallado y cerrado.** En Windows existe la herramienta PowerShell, que no pasa por las reglas de Bash ni por el hook.
Se denegó entera y el hook bloquea `powershell`/`pwsh`/`cmd` desde Bash (3 pruebas nuevas; total 31/31).

**Riesgo residual (sin sandbox).** Un script (`node -e`, `python -c`…) puede leer fuera del repo o usar la red, y `grep -r` puede
leer `.env.local` si existiera. Mitigación: no hay secretos reales en disco (emulador y `env.example` falso), cada orden que
pide permiso se lee antes de aprobarla y nada con efecto afuera se ejecuta sin permiso.

**Al migrar a WSL2.** Borrar `.claude/settings.local.json`; `npm ci` de nuevo (los binarios de `node_modules` son por sistema);
`npm run check`; las 10 pruebas de contención con captura; y volver a verificar el código escrito en este período.
