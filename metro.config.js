const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const { conReactNativeRealParaExpoAsset } = require('./metro-excepciones');
const palette = require('./src/theme/palette.json');

// Las variables de color cambian en tiempo de ejecución entre claro y oscuro (D46): hay que
// excluirlas del inlining, o el compilador las reemplazaría por su valor claro.
const aVariable = (token) =>
  `--color-${token.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}`;
const variablesDeColor = Object.keys(palette.light).map(aVariable);

const config = getDefaultConfig(__dirname);

// `expo-asset` necesita el `react-native` real, no el de NativeWind (D79): sin esto ningún icono carga.
module.exports = conReactNativeRealParaExpoAsset(
  withNativewind(config, { inlineVariables: { exclude: variablesDeColor } }),
  config.resolver?.resolveRequest,
);
