import { ActivityIndicator, View } from 'react-native';
import { useColores } from '@/theme/EsquemaProvider';
import { Boton } from './Boton';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

/**
 * Carga: progreso visible y anunciado una sola vez (un único elemento accesible con región viva),
 * nunca un «vacío» parpadeando durante la primera lectura.
 */
export function Cargando() {
  const colores = useColores();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      accessibilityLiveRegion="polite"
      className="flex-1 items-center justify-center gap-3 p-6"
    >
      <ActivityIndicator size="large" color={colores.primary} />
      <Texto>Cargando…</Texto>
    </View>
  );
}

export interface VacioProps {
  readonly titulo: string;
  readonly mensaje: string;
  readonly icono?: NombreIcono;
  readonly accion?: { readonly titulo: string; readonly alPulsar: () => void };
}

/** Vacío: dice qué falta y qué hacer, con la acción a mano. */
export function Vacio({ titulo, mensaje, icono = 'leaf-outline', accion }: VacioProps) {
  return (
    <View className="items-center gap-3 p-6">
      <Icono nombre={icono} tamano={48} tono="primary" />
      <Texto variante="subtitulo" className="text-center">
        {titulo}
      </Texto>
      <Texto tono="tenue" className="text-center">
        {mensaje}
      </Texto>
      {accion ? <Boton titulo={accion.titulo} onPress={accion.alPulsar} /> : null}
    </View>
  );
}

/** Error: mensaje anunciable (alerta) y un botón para reintentar. */
export function ErrorConReintento({
  mensaje,
  reintentar,
}: {
  readonly mensaje: string;
  readonly reintentar: () => void;
}) {
  return (
    <View className="items-center gap-3 p-6">
      {/* Solo el texto es la alerta: el botón debe seguir siendo enfocable por separado. */}
      <View accessible accessibilityRole="alert" className="items-center gap-3">
        <Icono nombre="alert-circle" tamano={48} tono="danger" />
        <Texto variante="subtitulo" className="text-center">
          No se pudo cargar
        </Texto>
        <Texto tono="tenue" className="text-center">
          {mensaje}
        </Texto>
      </View>
      <Boton titulo="Reintentar" icono="refresh" onPress={reintentar} />
    </View>
  );
}
