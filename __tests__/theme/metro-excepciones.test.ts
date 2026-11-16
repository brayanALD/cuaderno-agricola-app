import { conReactNativeRealParaExpoAsset } from '../../metro-excepciones';

const CONTEXTO_BASE = { resolveRequest: jest.fn() };

/** Un `resolveRequest` que anota con qué nombre lo llamaron y devuelve una marca fácil de reconocer. */
const resolutor = (marca: string) => jest.fn(() => ({ type: 'sourceFile', filePath: marca }));

function montar() {
  const conEstilos = resolutor('react-native-css');
  const base = resolutor('react-native-real');
  const config = conReactNativeRealParaExpoAsset(
    { otraOpcion: 1, resolver: { sourceExts: ['css'], resolveRequest: conEstilos } },
    base,
  );
  const resolver = (origen: string, modulo = 'react-native') =>
    config.resolver.resolveRequest(
      { ...CONTEXTO_BASE, originModulePath: origen },
      modulo,
      'android',
    );
  return { config, conEstilos, base, resolver };
}

describe('conReactNativeRealParaExpoAsset (D79)', () => {
  it('expo-asset recibe el react-native REAL: el de NativeWind no exporta AssetRegistry', () => {
    const { resolver, base, conEstilos } = montar();

    const resultado = resolver('C:/proyecto/node_modules/expo-asset/build/Asset.js');

    expect(resultado).toEqual({ type: 'sourceFile', filePath: 'react-native-real' });
    expect(base).toHaveBeenCalledTimes(1);
    expect(conEstilos).not.toHaveBeenCalled();
  });

  it('también con rutas de Windows (barras invertidas)', () => {
    const { resolver, conEstilos } = montar();

    const resultado = resolver(
      'C:\\proyecto\\node_modules\\expo-asset\\build\\resolveAssetSource.js',
    );

    expect(resultado).toEqual({ type: 'sourceFile', filePath: 'react-native-real' });
    expect(conEstilos).not.toHaveBeenCalled();
  });

  it('el código de la app sigue usando el react-native con estilos (className)', () => {
    const { resolver, base } = montar();

    const resultado = resolver('C:/proyecto/src/components/Boton.tsx');

    expect(resultado).toEqual({ type: 'sourceFile', filePath: 'react-native-css' });
    expect(base).not.toHaveBeenCalled();
  });

  it('otras librerías también siguen igual: la excepción es solo para expo-asset', () => {
    const { resolver, base } = montar();

    resolver('C:/proyecto/node_modules/expo-router/build/index.js');
    resolver('C:/proyecto/node_modules/expo-font/build/Font.js');

    expect(base).not.toHaveBeenCalled();
  });

  it('dentro de expo-asset solo cambia `react-native`: lo demás pasa por NativeWind', () => {
    const { resolver, base, conEstilos } = montar();

    resolver('C:/proyecto/node_modules/expo-asset/build/Asset.js', 'expo-modules-core');

    expect(conEstilos).toHaveBeenCalledTimes(1);
    expect(base).not.toHaveBeenCalled();
  });

  it('una carpeta que solo se parece (mi-expo-asset) no cuenta', () => {
    const { resolver, base } = montar();

    resolver('C:/proyecto/node_modules/mi-expo-asset-falso/index.js');

    expect(base).not.toHaveBeenCalled();
  });

  it('sin resolutor base usa el de Metro que llega en el contexto', () => {
    const deMetro = resolutor('metro-por-defecto');
    const config = conReactNativeRealParaExpoAsset(
      { resolver: { resolveRequest: resolutor('react-native-css') } },
      undefined,
    );

    const resultado = config.resolver.resolveRequest(
      { resolveRequest: deMetro, originModulePath: '/x/node_modules/expo-asset/build/Asset.js' },
      'react-native',
      'android',
    );

    expect(resultado).toEqual({ type: 'sourceFile', filePath: 'metro-por-defecto' });
  });

  it('conserva el resto de la configuración', () => {
    const { config } = montar();

    expect(config).toMatchObject({ otraOpcion: 1, resolver: { sourceExts: ['css'] } });
  });
});
