// Excepciones al resolutor de Metro que instala NativeWind v5 (D79).
//
// Con `globalClassNamePolyfill`, NativeWind hace que TODO `import ... from 'react-native'` apunte a
// `react-native-css/components`, un módulo con los exports de React Native escritos a mano. En
// `react-native-css 3.1.0-rc.1` falta `AssetRegistry` (que React Native 0.88 sí exporta) y `expo-asset`
// hace `import { AssetRegistry } from 'react-native'`: recibía `undefined` y `getAssetByID` reventaba
// al cargar cualquier fuente, así que ningún icono de `@expo/vector-icons` aparecía.

const ES_DE_EXPO_ASSET = /[\\/]node_modules[\\/]expo-asset[\\/]/;

/**
 * `expo-asset` usa el `react-native` real; todo lo demás sigue con el de NativeWind (`className`).
 * Quitar cuando salga una versión de `react-native-css` que exporte `AssetRegistry`.
 *
 * @param config configuración ya envuelta por `withNativewind`
 * @param resolutorBase `resolveRequest` de la configuración original (antes de NativeWind), si tenía
 */
function conReactNativeRealParaExpoAsset(config, resolutorBase) {
  const conEstilos = config.resolver.resolveRequest;
  return {
    ...config,
    resolver: {
      ...config.resolver,
      resolveRequest: (context, moduleName, platform) => {
        if (moduleName === 'react-native' && ES_DE_EXPO_ASSET.test(context.originModulePath)) {
          return (resolutorBase ?? context.resolveRequest)(context, moduleName, platform);
        }
        return conEstilos(context, moduleName, platform);
      },
    },
  };
}

module.exports = { conReactNativeRealParaExpoAsset };
