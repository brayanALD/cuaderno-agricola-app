import { Tabs } from 'expo-router';
import { Icono } from '@/components/Icono';
import { useInsetInferior } from '@/hooks/useInsetInferior';
import { useColores } from '@/theme/EsquemaProvider';

/** Pestañas de JS (D47): estables y con los colores de la paleta, que cumplen contraste AA. */
export default function DisposicionPestanas() {
  const colores = useColores();
  const inferior = useInsetInferior();
  return (
    <Tabs
      safeAreaInsets={{ bottom: inferior }}
      screenOptions={{
        tabBarActiveTintColor: colores.primary,
        tabBarInactiveTintColor: colores.textMuted,
        tabBarStyle: { backgroundColor: colores.surface, borderTopColor: colores.border },
        tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
        headerStyle: { backgroundColor: colores.surface },
        headerTintColor: colores.text,
        sceneStyle: { backgroundColor: colores.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lotes',
          tabBarAccessibilityLabel: 'Lotes',
          tabBarIcon: ({ focused, size }) => (
            <Icono nombre="leaf" tamano={size} tono={focused ? 'primary' : 'textMuted'} />
          ),
        }}
      />
      <Tabs.Screen
        name="labores"
        options={{
          title: 'Labores',
          tabBarAccessibilityLabel: 'Labores recientes y próximas',
          tabBarIcon: ({ focused, size }) => (
            <Icono nombre="calendar" tamano={size} tono={focused ? 'primary' : 'textMuted'} />
          ),
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Cuenta',
          tabBarAccessibilityLabel: 'Cuenta y cerrar sesión',
          tabBarIcon: ({ focused, size }) => (
            <Icono nombre="person" tamano={size} tono={focused ? 'primary' : 'textMuted'} />
          ),
        }}
      />
    </Tabs>
  );
}
