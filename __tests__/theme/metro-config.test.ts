import { variablesDeTema } from '@/theme/tokens';

jest.mock('expo/metro-config', () => ({ getDefaultConfig: () => ({ marcador: 'config-base' }) }));
jest.mock('nativewind/metro', () => ({
  withNativewind: (config: unknown, opciones: unknown) => ({
    config,
    opciones,
    resolver: { resolveRequest: () => 'nativewind' },
  }),
}));

describe('metro.config.js', () => {
  it('excluye del inlining todas las variables de color que cambian entre claro y oscuro', () => {
    const resultado = jest.requireActual<{
      config: unknown;
      opciones: { inlineVariables: { exclude: string[] } };
      resolver: { resolveRequest: unknown };
    }>('../../metro.config');

    expect(resultado.config).toEqual({ marcador: 'config-base' });
    expect(typeof resultado.resolver.resolveRequest).toBe('function');
    expect([...resultado.opciones.inlineVariables.exclude].sort()).toEqual(
      Object.keys(variablesDeTema('light')).sort(),
    );
  });
});
