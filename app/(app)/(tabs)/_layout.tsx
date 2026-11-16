import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Icono, type NombreIcono } from '@/components/Icono';
import { unir } from '@/components/unir';
import { useInsetInferior } from '@/hooks/useInsetInferior';
import { useResumen } from '@/hooks/useLabores';
import { usePendientes } from '@/hooks/usePendientes';
import { useColores } from '@/theme/EsquemaProvider';
import type { ColoresDeTema } from '@/theme/tokens';

/** Icono de pestaña: la activa lleva una píldora tonal (forma + color, no solo color). */
function IconoDePestana({ nombre, activa }: { nombre: NombreIcono; activa: boolean }) {
  return (
    <View
      className={unir(
        'h-8 w-16 items-center justify-center rounded-full',
        activa && 'bg-primary-soft',
      )}
    >
      <Icono nombre={nombre} tono={activa ? 'primary' : 'textMuted'} />
    </View>
  );
}

/** El número que va en una insignia de pestaña: sin nada que avisar, no hay insignia. */
const numeroODefecto = (cantidad: number): number | undefined =>
  cantidad > 0 ? cantidad : undefined;

const descripcion = (base: string, cantidad: number, motivo: string): string =>
  cantidad > 0 ? `${base}, ${String(cantidad)} ${motivo}` : base;

/** Labores de hoy o vencidas (insignia de Labores) y elementos con aviso de sincronización (Cuenta). */
function useInsignias(): { porHacer: number; conAviso: number } {
  const resumen = useResumen();
  const pendientes = usePendientes();
  return {
    porHacer: resumen.vista.estado === 'listo' ? resumen.vista.datos.vencidas : 0,
    conAviso: pendientes.vista.estado === 'listo' ? pendientes.vista.datos.conAviso : 0,
  };
}

const opcionesComunes = (colores: ColoresDeTema) =>
  ({
    tabBarActiveTintColor: colores.text,
    tabBarInactiveTintColor: colores.textMuted,
    tabBarStyle: { backgroundColor: colores.surface, borderTopColor: colores.divider },
    tabBarLabelStyle: { fontSize: 13, fontWeight: '600' },
    tabBarBadgeStyle: { backgroundColor: colores.danger, color: colores.onDanger },
    headerStyle: { backgroundColor: colores.surface },
    headerTintColor: colores.text,
    sceneStyle: { backgroundColor: colores.background },
  }) as const;

/**
 * Pestañas de JS (D47): estables y con los colores de la paleta, que cumplen contraste AA. Labores lleva el
 * número de labores de hoy o vencidas y Cuenta el de elementos con aviso de sincronización (D104).
 */
export default function DisposicionPestanas() {
  const colores = useColores();
  const inferior = useInsetInferior();
  const { porHacer, conAviso } = useInsignias();
  return (
    <Tabs safeAreaInsets={{ bottom: inferior }} screenOptions={opcionesComunes(colores)}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Lotes',
          tabBarAccessibilityLabel: 'Lotes',
          tabBarIcon: ({ focused }) => <IconoDePestana nombre="leaf" activa={focused} />,
        }}
      />
      <Tabs.Screen
        name="labores"
        options={{
          title: 'Labores',
          tabBarAccessibilityLabel: descripcion(
            'Labores recientes y próximas',
            porHacer,
            'de hoy o vencidas',
          ),
          tabBarBadge: numeroODefecto(porHacer),
          tabBarIcon: ({ focused }) => <IconoDePestana nombre="calendar" activa={focused} />,
        }}
      />
      <Tabs.Screen
        name="cuenta"
        options={{
          title: 'Cuenta',
          tabBarAccessibilityLabel: descripcion('Cuenta y cerrar sesión', conAviso, 'con aviso'),
          tabBarBadge: numeroODefecto(conAviso),
          tabBarIcon: ({ focused }) => <IconoDePestana nombre="person" activa={focused} />,
        }}
      />
    </Tabs>
  );
}
