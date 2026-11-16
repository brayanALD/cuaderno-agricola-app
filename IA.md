# IA · índice de evidencias

Configuración de IA propia de este repositorio (sección 14 de `docs/ESPECIFICACION.md`). Herramienta: Claude Code, en WSL2.

| Evidencia | Archivo |
|---|---|
| Reglas del proyecto para la IA | `AGENTS.md` (`CLAUDE.md` solo contiene `@AGENTS.md`) |
| Permisos, sandbox y hook | `.claude/settings.json`, `.claude/hooks/guard.mjs` |
| Qué riesgo cubre cada barrera, límites y ajustes | `ia/CONFIGURACION.md` |
| Las 10 pruebas de contención (prompt, resultado, captura) | `ia/PRUEBAS-CONTENCION.md` |
| Pruebas automáticas del hook (31) | `.claude/hooks/guard.test.mjs` → `npm run test:hooks` |
| Bitácora (propósito, evidencia, validación, decisión + rechazos) | `ia/BITACORA.md` |
| Secretos: valores falsos | `env.example` |
| Calidad automática | `npm run check` |
| Skills instaladas, revisadas y rechazadas (commit y hash) | `ia/SKILLS.md`, `.claude/skills/` |

Estado honesto: lo que depende de WSL2 está marcado **PENDIENTE** en `ia/PRUEBAS-CONTENCION.md` hasta ejecutarse.
