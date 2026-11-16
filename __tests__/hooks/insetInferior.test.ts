import { insetInferior, MARGEN_MINIMO_INFERIOR } from '@/hooks/useInsetInferior';

describe('insetInferior (D87: zona del gesto de inicio)', () => {
  it('con 0 de zona segura (gestos del A35) usa el margen mínimo', () => {
    expect(insetInferior(0)).toBe(MARGEN_MINIMO_INFERIOR);
  });

  it('con una barra de navegación mayor que el mínimo conserva la real (no duplica espacio)', () => {
    expect(insetInferior(48)).toBe(48);
  });

  it('con una zona segura menor que el mínimo sube hasta el mínimo', () => {
    expect(insetInferior(10)).toBe(16);
  });
});
