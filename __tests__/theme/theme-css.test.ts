import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { variablesDeTema } from '@/theme/tokens';

const raiz = join(__dirname, '..', '..');

describe('src/theme/theme.css', () => {
  it('está sincronizado con palette.json (scripts/gen-theme-css.mjs --check)', () => {
    const comprobar = () =>
      execFileSync(process.execPath, ['scripts/gen-theme-css.mjs', '--check'], {
        cwd: raiz,
        stdio: 'pipe',
      });

    expect(comprobar).not.toThrow();
  });

  it('define cada variable en @theme (genera las utilidades) y en :root (valor de arranque)', () => {
    const css = readFileSync(join(raiz, 'src', 'theme', 'theme.css'), 'utf8');
    const variables = Object.keys(variablesDeTema('light'));

    expect(css).toContain('@theme {');
    expect(css).toContain(':root {');
    for (const variable of variables) {
      const apariciones = css.split(`${variable}:`).length - 1;
      expect({ variable, apariciones }).toEqual({ variable, apariciones: 2 });
    }
  });
});
