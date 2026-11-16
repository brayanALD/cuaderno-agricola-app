import palette from '@/theme/palette.json';
import { aVariable, coloresDeTema, variablesDeTema } from '@/theme/tokens';

describe('aVariable', () => {
  it('convierte el nombre del token a variable CSS en kebab-case', () => {
    expect(aVariable('background')).toBe('--color-background');
    expect(aVariable('surfaceMuted')).toBe('--color-surface-muted');
    expect(aVariable('onPrimary')).toBe('--color-on-primary');
  });
});

describe('variablesDeTema', () => {
  it.each(['light', 'dark'] as const)(
    'el tema %s trae una variable por token, con su valor',
    (tema) => {
      const variables = variablesDeTema(tema);

      expect(Object.keys(variables)).toHaveLength(Object.keys(palette[tema]).length);
      expect(variables['--color-primary']).toBe(palette[tema].primary);
      expect(variables['--color-surface-muted']).toBe(palette[tema].surfaceMuted);
    },
  );

  it('el tema claro y el oscuro definen las mismas variables', () => {
    expect(Object.keys(variablesDeTema('dark')).sort()).toEqual(
      Object.keys(variablesDeTema('light')).sort(),
    );
  });

  it('el oscuro cambia los valores que importan (fondo y texto)', () => {
    expect(variablesDeTema('dark')['--color-background']).not.toBe(
      variablesDeTema('light')['--color-background'],
    );
    expect(variablesDeTema('dark')['--color-text']).toBe('#EAF3F0');
  });
});

describe('coloresDeTema', () => {
  it('devuelve los colores crudos del esquema (para iconos, pestañas y navegación)', () => {
    expect(coloresDeTema('light').primary).toBe('#0B6E4F');
    expect(coloresDeTema('dark').primary).toBe('#6BBF59');
  });
});
