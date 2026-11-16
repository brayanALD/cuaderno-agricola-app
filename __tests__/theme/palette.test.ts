import palette from '@/theme/palette.json';

const HEX_6 = /^#[0-9A-F]{6}$/i;
const temas = ['light', 'dark'] as const;

describe('palette.json', () => {
  it('el tema claro y el oscuro definen exactamente los mismos tokens', () => {
    expect(Object.keys(palette.dark).sort()).toEqual(Object.keys(palette.light).sort());
  });

  it.each(temas)('todos los valores del tema %s son colores hex de 6 dígitos', (tema) => {
    const invalidos = Object.entries(palette[tema])
      .filter(([, valor]) => !HEX_6.test(valor))
      .map(([token]) => token);

    expect(invalidos).toEqual([]);
  });
});
