#!/usr/bin/env node
// Hook PreToolUse propio. Segunda capa de defensa (la primera son permissions.deny y el sandbox).
// Bloquea: lectura/edición de secretos (.env*, claves), rutas fuera del proyecto,
// curl/wget/sudo y edición de .claude/. Entrada: JSON por stdin.
// Salida: código 2 + motivo en stderr = bloquear; código 0 = seguir el flujo normal de permisos.
// Límite conocido: una regla sobre texto NO es una frontera (p. ej. `grep -r X .` lee .env.local
// sin nombrarlo). Esa parte la cubre el sandbox. Ver ia/CONFIGURACION.md.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SECRET_NAME = /^\.env|\.(pem|key|keystore|jks)$|firebase-adminsdk/i;
const ENV_LOOSE = /(^|[\s/\\'"=<>])\.env[\w.*-]*(?=$|[\s'";|&)<>])/i;
// powershell/pwsh/cmd: en Windows nativo (sin sandbox) rodean las reglas de Bash y este hook.
const BLOCKED_COMMANDS = new Set(['curl', 'wget', 'sudo', 'powershell', 'pwsh', 'cmd']);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash']);
const WRAPPERS = new Set(['env', 'command', 'nohup', 'time', 'exec', 'nice']);
const SUBSHELL_BLOCKED = /(\$\(|`)\s*(?:\S*[\\/])?(curl|wget|sudo)\b/i;
const HOME_REF = /^(~|\$\{?(HOME|USERPROFILE)\}?)([\\/]|$)/;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'NotebookEdit']);

export function isSecretName(p) {
  const base = p.split(/[\\/]/).pop() ?? '';
  return SECRET_NAME.test(base);
}

export function isOutside(abs, root) {
  const rel = path.relative(root, abs);
  return rel.startsWith('..') || path.isAbsolute(rel);
}

const hasDotDot = (p) => /(^|[\\/])\.\.($|[\\/])/.test(p);
const looksAbsolute = (p) => path.isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p);

function checkPath(p, ctx) {
  if (!p) return null;
  if (isSecretName(p)) return `acceso a secretos (${p})`;
  if (HOME_REF.test(p)) return `ruta fuera del proyecto (directorio personal: ${p})`;
  const dotdot = hasDotDot(p);
  if (!dotdot && !looksAbsolute(p)) return null;
  const abs = path.resolve(ctx.cwd, p);
  if (!isOutside(abs, ctx.root)) return null;
  // En Bash un token como "/api/auth" puede ser un patrón y no una ruta: solo se bloquea si el
  // directorio padre existe. En las herramientas de archivos (strict) el argumento siempre es
  // una ruta y Write crea carpetas, así que no se aplica ese filtro.
  const plausible = ctx.strict || dotdot || (existsSync(path.dirname(abs)) && abs !== path.resolve('/dev/null'));
  return plausible ? `ruta fuera del proyecto (${p})` : null;
}

function checkToken(raw, ctx) {
  const t = raw.replace(/^[<>]+/, '');
  const eq = t.indexOf('=');
  return checkPath(t, ctx) ?? (eq > 0 ? checkPath(t.slice(eq + 1), ctx) : null);
}

// Divide un comando de shell en segmentos de tokens respetando comillas.
export function parseCommand(command) {
  const segments = [];
  let tokens = [];
  let cur = '';
  let hasCur = false;
  let quote = null;
  const pushTok = () => {
    if (hasCur) tokens.push(cur);
    cur = '';
    hasCur = false;
  };
  const pushSeg = () => {
    pushTok();
    if (tokens.length) segments.push(tokens);
    tokens = [];
  };
  for (const c of command) {
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
      hasCur = true;
    } else if (c === ' ' || c === '\t' || c === '\r') pushTok();
    else if (';&|\n`()'.includes(c)) pushSeg();
    else {
      cur += c;
      hasCur = true;
    }
  }
  pushSeg();
  return segments;
}

function commandWord(tokens) {
  const rest = [...tokens];
  while (rest.length && (/^\w+=/.test(rest[0]) || WRAPPERS.has(rest[0]))) rest.shift();
  const first = (rest[0] ?? '').split(/[\\/]/).pop().toLowerCase().replace(/\.exe$/, '');
  return { first, rest };
}

function checkSegment(tokens, ctx, depth) {
  const { first, rest } = commandWord(tokens);
  if (BLOCKED_COMMANDS.has(first)) return `comando prohibido (${first})`;
  if (SHELLS.has(first) && depth < 3) {
    const i = rest.findIndex((t) => /^-[a-z]*c[a-z]*$/.test(t));
    const nested = i >= 0 ? rest[i + 1] : undefined;
    const reason = nested ? checkBash(nested, ctx, depth + 1) : null;
    if (reason) return reason;
  }
  for (const t of tokens) {
    const reason = checkToken(t, ctx);
    if (reason) return reason;
  }
  return null;
}

function checkBash(command, ctx, depth = 0) {
  if (ENV_LOOSE.test(command)) return 'acceso a secretos (.env*)';
  if (SUBSHELL_BLOCKED.test(command)) return 'comando prohibido dentro de una sustitución';
  for (const tokens of parseCommand(command)) {
    const reason = checkSegment(tokens, ctx, depth);
    if (reason) return reason;
  }
  return null;
}

function checkFileTool(name, input, ctx) {
  const target = input.file_path ?? input.notebook_path ?? input.path;
  if (target) {
    const reason = checkPath(target, ctx);
    if (reason) return reason;
    const abs = path.resolve(ctx.cwd, target);
    const claude = path.join(ctx.root, '.claude') + path.sep;
    if (EDIT_TOOLS.has(name) && (abs + path.sep).startsWith(claude)) {
      return 'la IA no puede modificar su propia configuración (.claude/)';
    }
  }
  const glob = name === 'Glob' ? input.pattern : name === 'Grep' ? input.glob : undefined;
  return glob && ENV_LOOSE.test(glob) ? 'búsqueda de secretos (.env*)' : null;
}

// Devuelve el motivo del bloqueo o null si se permite.
export function evaluate(input, root) {
  const cwd = input.cwd ?? root;
  const tool = input.tool_name;
  const args = input.tool_input ?? {};
  if (tool === 'Bash') return checkBash(String(args.command ?? ''), { root, cwd, strict: false });
  return checkFileTool(tool, args, { root, cwd, strict: true });
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.stderr.write('guard.mjs: entrada ilegible; se bloquea por seguridad\n');
    process.exit(2);
  }
  const root = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd());
  const reason = evaluate(input, root);
  if (reason) {
    process.stderr.write(`BLOQUEADO por .claude/hooks/guard.mjs: ${reason}. Pregunta al usuario.\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
