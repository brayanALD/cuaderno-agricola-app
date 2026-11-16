import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';
import { Cargando, ErrorConReintento } from '@/components/Estados';
import { ReprogramadorDeRecordatorios } from '@/components/ReprogramadorDeRecordatorios';
import { CuadernoProvider } from '@/context/CuadernoContext';
import { abrirContextoReal } from '@/context/contextoReal';
import { redReal } from '@/context/redReal';
import { useSesion } from '@/context/SesionContext';
import { SincronizacionProvider } from '@/context/SincronizacionContext';
import { clienteApiReal } from '@/context/sesionReal';
import { useOpcionesDePila } from '@/theme/useOpcionesDePila';

/**
 * Solo existe con sesión iniciada (el layout raíz lo protege): abre la base de ESE usuario (D60) y
 * monta las pantallas de la app. Si cambia de usuario, el proveedor vuelve a abrir la base que toca.
 */
export default function DisposicionPrivada() {
  const { usuario } = useSesion();
  const opciones = useOpcionesDePila();
  const uid = usuario?.id ?? null;
  const abrir = useCallback(
    () =>
      uid === null ? Promise.reject(new Error('No hay sesión iniciada.')) : abrirContextoReal(uid),
    [uid],
  );

  // Al cerrar sesión hay un instante en que este layout aún está montado sin usuario: no pintar nada.
  if (uid === null) return null;
  return (
    <CuadernoProvider
      abrir={abrir}
      cargando={
        <View className="flex-1 bg-background">
          <Cargando />
        </View>
      }
      alError={(reintentar, error) => (
        <View className="flex-1 justify-center bg-background">
          <ErrorConReintento mensaje={error.message} reintentar={reintentar} />
        </View>
      )}
    >
      <ReprogramadorDeRecordatorios />
      <SincronizacionProvider cliente={clienteApiReal()} red={redReal}>
        <Stack screenOptions={opciones}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="lote/nuevo" options={{ title: 'Nuevo lote' }} />
          <Stack.Screen name="lote/[id]" options={{ title: 'Lote' }} />
          <Stack.Screen name="lote/editar/[id]" options={{ title: 'Editar lote' }} />
          <Stack.Screen name="labor/nueva" options={{ title: 'Nueva labor' }} />
          <Stack.Screen name="labor/[id]" options={{ title: 'Editar labor' }} />
          <Stack.Screen name="foto/[id]" options={{ title: 'Foto', presentation: 'modal' }} />
        </Stack>
      </SincronizacionProvider>
    </CuadernoProvider>
  );
}
