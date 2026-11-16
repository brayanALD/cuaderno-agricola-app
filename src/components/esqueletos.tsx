import { View } from 'react-native';
import { Esqueleto, GrupoEsqueleto } from './Esqueleto';

/** Una tarjeta de lote: nombre, insignia, línea de datos y la franja de la próxima labor. */
function TarjetaDeLote() {
  return (
    <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <Esqueleto className="h-5 w-40" />
        <Esqueleto className="h-7 w-16 rounded-full" />
      </View>
      <Esqueleto className="h-3.5 w-56" />
      <Esqueleto className="h-12 w-full rounded-xl" />
    </View>
  );
}

/** Tres cifras del resumen de la finca. */
function ResumenDeFinca() {
  return (
    <View className="flex-row gap-2">
      {[0, 1, 2].map((numero) => (
        <View
          key={numero}
          className="flex-1 gap-2 rounded-2xl border border-divider bg-surface p-3"
        >
          <Esqueleto className="h-6 w-10" />
          <Esqueleto className="h-3 w-16" />
        </View>
      ))}
    </View>
  );
}

/** Pestaña Lotes mientras se leen los lotes: el resumen y dos tarjetas. */
export function EsqueletoDeLotes() {
  return (
    <GrupoEsqueleto>
      <ResumenDeFinca />
      <TarjetaDeLote />
      <TarjetaDeLote />
    </GrupoEsqueleto>
  );
}

/** Una labor de la bitácora: icono, dos líneas y la miniatura de la foto. */
function FilaDeLabor() {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-divider bg-surface p-3">
      <Esqueleto className="h-10 w-10 rounded-xl" />
      <View className="flex-1 gap-2">
        <Esqueleto className="h-4 w-36" />
        <Esqueleto className="h-3 w-48" />
      </View>
      <Esqueleto className="h-12 w-12 rounded-xl" />
    </View>
  );
}

/** Bitácora o lista de labores mientras se leen. */
export function EsqueletoDeLabores() {
  return (
    <GrupoEsqueleto>
      <FilaDeLabor />
      <FilaDeLabor />
      <FilaDeLabor />
    </GrupoEsqueleto>
  );
}

/** Contenido que ya está dentro de una tarjeta (producción, ciclos): una cifra y un bloque, sin otra tarjeta. */
export function EsqueletoDeContenido() {
  return (
    <GrupoEsqueleto>
      <Esqueleto className="h-8 w-32" />
      <Esqueleto className="h-24 w-full" />
    </GrupoEsqueleto>
  );
}

/** Una tarjeta suelta de la ficha del lote (próxima labor, producción): título y dos líneas. */
export function EsqueletoDeTarjeta() {
  return (
    <GrupoEsqueleto>
      <View className="gap-3 rounded-2xl border border-divider bg-surface p-4">
        <Esqueleto className="h-5 w-32" />
        <Esqueleto className="h-4 w-full" />
        <Esqueleto className="h-4 w-2/3" />
      </View>
    </GrupoEsqueleto>
  );
}
