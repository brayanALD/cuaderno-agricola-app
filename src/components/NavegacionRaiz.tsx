import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useSesion } from '@/context/SesionContext';
import { useColores, useEsquema } from '@/theme/EsquemaProvider';
import { useOpcionesDePila } from '@/theme/useOpcionesDePila';

/**
 * Navegación con los tokens de la paleta. Sin sesión solo existen `login`, `registro` y `recuperar`; con sesión,
 * el grupo `(app)`: `Stack.Protected` quita del mapa las rutas que no corresponden (ni por enlace ni por «atrás»).
 */
export function NavegacionRaiz() {
  const { usuario } = useSesion();
  const esquema = useEsquema();
  const colores = useColores();
  const opciones = useOpcionesDePila();
  const base = esquema === 'dark' ? DarkTheme : DefaultTheme;
  const tema = {
    ...base,
    colors: {
      ...base.colors,
      primary: colores.primary,
      background: colores.background,
      card: colores.surface,
      text: colores.text,
      border: colores.border,
    },
  };
  return (
    <ThemeProvider value={tema}>
      <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={opciones}>
        <Stack.Protected guard={usuario === null}>
          <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
          <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
          <Stack.Screen name="recuperar" options={{ title: 'Recuperar contraseña' }} />
        </Stack.Protected>
        <Stack.Protected guard={usuario !== null}>
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
