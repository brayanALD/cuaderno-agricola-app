// Pruebas del hook guard.mjs con node:test. Ejecutar: npm run test:hooks
// Se prueba el contrato real: proceso hijo + JSON por stdin + código de salida + stderr.
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const guard = path.join(here, 'guard.mjs');

function run(tool_name, tool_input) {
  return spawnSync(process.execPath, [guard], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', cwd: root, tool_name, tool_input }),
    env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    encoding: 'utf8',
  });
}
const bash = (command) => run('Bash', { command });

function assertBlocked(result, motivo) {
  assert.equal(result.status, 2, `debía bloquear (stderr: ${result.stderr})`);
  assert.match(result.stderr, /BLOQUEADO/);
  if (motivo) assert.match(result.stderr, motivo);
}
function assertAllowed(result) {
  assert.equal(result.status, 0, `debía permitir (stderr: ${result.stderr})`);
}

// ---- Deben bloquearse (las 10 pruebas de contención que cubre el hook) ----
test('01 Read de .env.local', () => assertBlocked(run('Read', { file_path: path.join(root, '.env.local') }), /secretos/));
test('02 Bash cat .env', () => assertBlocked(bash('cat .env'), /secretos/));
test('03 Bash lee cuenta de servicio de Firebase', () =>
  assertBlocked(bash('cat config/firebase-adminsdk-abc123.json'), /secretos/));
test('04 Read fuera del proyecto', () =>
  assertBlocked(run('Read', { file_path: path.join(root, '..', 'otro', 'x.txt') }), /fuera del proyecto/));
test('05 Bash ls ..', () => assertBlocked(bash('ls ..'), /fuera del proyecto/));
test('06 Bash cat ~/.bashrc', () => assertBlocked(bash('cat ~/.bashrc'), /fuera del proyecto/));
test('07 Bash curl', () => assertBlocked(bash('curl https://example.com'), /curl/));
test('08 Bash /usr/bin/curl (ruta absoluta)', () => assertBlocked(bash('/usr/bin/curl https://example.com'), /curl/));
test('09 Bash bash -c con wget', () => assertBlocked(bash("bash -c 'wget http://x.test/a'"), /wget/));
test('10 Bash sudo', () => assertBlocked(bash('sudo apt install algo'), /sudo/));
test('11 Edit de .claude/settings.json', () =>
  assertBlocked(run('Edit', { file_path: path.join(root, '.claude', 'settings.json') }), /\.claude/));
test('12 Write en una ruta absoluta fuera del proyecto', () =>
  assertBlocked(run('Write', { file_path: path.join(os.tmpdir(), 'x.txt'), content: 'x' }), /fuera del proyecto/));
test('12b Write en una carpeta externa que no existe (Write crea carpetas padre)', () =>
  assertBlocked(run('Write', { file_path: path.join(root, '..', 'no-existe', 'a', 'x.txt'), content: 'x' }), /fuera del proyecto/));
test('13 curl tras otro comando (;)', () => assertBlocked(bash('echo hola; curl https://x.test'), /curl/));
test('14 curl con variable de entorno delante', () => assertBlocked(bash('FOO=1 curl https://x.test'), /curl/));
test('15 node -e que lee .env.local', () =>
  assertBlocked(bash(`node -e "require('fs').readFileSync('.env.local','utf8')"`), /secretos/));
test('16 sustitución $(curl ...) dentro de comillas', () => assertBlocked(bash('echo "$(curl https://x.test)"')));
test('16b Bash powershell (rodea las reglas de Bash en Windows)', () =>
  assertBlocked(bash('powershell -Command "Get-ChildItem C:\\Users"'), /powershell/));
test('16c Bash pwsh.exe con ruta absoluta', () =>
  assertBlocked(bash('"C:/Program Files/PowerShell/7/pwsh.exe" -c ls'), /pwsh/));
test('16d Bash cmd /c', () => assertBlocked(bash('cmd /c dir'), /cmd/));
test('17 Glob de .env*', () => assertBlocked(run('Glob', { pattern: '**/.env*' }), /secretos/));
test('18 entrada ilegible se bloquea (falla cerrada)', () => {
  const r = spawnSync(process.execPath, [guard], { input: 'no es json', encoding: 'utf8' });
  assert.equal(r.status, 2);
});

// ---- Deben permitirse (sin falsos positivos que estorben el trabajo normal) ----
test('A1 Read de un archivo del proyecto', () => assertAllowed(run('Read', { file_path: path.join(root, 'package.json') })));
test('A2 Read de env.example (no es secreto)', () => assertAllowed(run('Read', { file_path: path.join(root, 'env.example') })));
test('A3 Bash npm run check', () => assertAllowed(bash('npm run check')));
test('A4 node -e con process.env no es un .env', () => assertAllowed(bash(`node -e "console.log(process.env.NODE_ENV)"`)));
test('A5 el texto "curl" dentro de un mensaje de commit no bloquea', () =>
  assertAllowed(bash('git commit -m "docs: no usar curl ni sudo"')));
test('A5b los textos «powershell» y «cmd» dentro de un commit no bloquean', () =>
  assertAllowed(bash('git commit -m "docs: usar powershell o cmd solo a mano"')));
test('A6 patrón con ruta de API no es una ruta del disco', () => assertAllowed(bash('rg "/api/auth" src')));
test('A7 Edit de un archivo normal del proyecto', () =>
  assertAllowed(run('Edit', { file_path: path.join(root, 'docs', 'PLAN.md') })));
test('A8 Read de .claude/ está permitido (solo se impide editar)', () =>
  assertAllowed(run('Read', { file_path: path.join(root, '.claude', 'settings.json') })));
