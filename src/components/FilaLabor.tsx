import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { GestureDetector, useLongPressGesture } from 'react-native-gesture-handler';
import type { LaborFila } from '@/db/modelo';
import { formatearCantidad } from '@/services/cantidad';
import { ETIQUETA_LUZ, ETIQUETA_TIPO } from '@/services/etiquetas';
import { formatearFecha } from '@/services/fechas';
import { AvisoDeSync } from './AvisoDeSync';
import { descripcionDeEstado, EstadoDeFila } from './EstadoDeFila';
import { Icono } from './Icono';
import { ICONO_TIPO } from './iconosDeLabor';
import { Insignia } from './Insignia';
import { MenuDeAcciones } from './MenuDeAcciones';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

/** Medio segundo: lo bastante largo para no duplicar sin querer al tocar o desplazar. */
export const DURACION_MANTENER_MS = 500;

export interface FilaLaborProps {
  readonly labor: LaborFila;
  readonly alEditar: (id: string) => void;
  readonly alDuplicar: (id: string) => void;
  readonly alBorrar: (id: string) => void;
  readonly alVerFoto?: (id: string) => void;
  /** Nombre del lote, cuando la fila se muestra fuera de su bitácora (pestaña «Labores»). */
  readonly nombreDeLote?: string;
}

interface CuerpoProps {
  readonly labor: LaborFila;
  readonly resumen: string;
  readonly nombreDeLote?: string;
  readonly alEditar: (id: string) => void;
  readonly alDuplicar: (id: string) => void;
  readonly alBorrar: (id: string) => void;
}

/** Acciones del lector de pantalla: duplicar y borrar sin gestos ni menús (WCAG 2.5.1). */
const ACCIONES_ACCESIBLES = [
  { name: 'duplicar', label: 'Duplicar con la fecha de hoy' },
  { name: 'borrar', label: 'Borrar la labor' },
] as const;

/** Tipo, cantidad, fecha, lote, nota, luz y estado de sincronización de una labor. */
function TextosDeLabor({
  labor,
  cantidad,
  nombreDeLote,
}: {
  labor: LaborFila;
  cantidad: string | null;
  nombreDeLote?: string;
}) {
  return (
    <View className="flex-1 gap-0.5">
      <View className="flex-row items-center gap-2">
        <Texto variante="etiqueta" className="flex-1">
          {ETIQUETA_TIPO[labor.tipo]}
        </Texto>
        {cantidad ? <Texto variante="etiqueta">{cantidad}</Texto> : null}
      </View>
      <Texto variante="ayuda">{formatearFecha(labor.fecha)}</Texto>
      {nombreDeLote ? <Texto variante="ayuda">Lote: {nombreDeLote}</Texto> : null}
      {labor.nota ? <Texto>{labor.nota}</Texto> : null}
      {labor.luz ? (
        <Insignia
          tono="neutro"
          icono={labor.luz === 'soleado' ? 'sunny-outline' : 'cloudy-outline'}
        >
          {ETIQUETA_LUZ[labor.luz]}
        </Insignia>
      ) : null}
      <EstadoDeFila pending={labor.pending} syncError={labor.sync_error} />
      <AvisoDeSync mensaje={labor.sync_error} />
    </View>
  );
}

/** Datos de la labor; tocarlos la edita. */
function CuerpoDeLabor({
  labor,
  resumen,
  nombreDeLote,
  alEditar,
  alDuplicar,
  alBorrar,
}: CuerpoProps) {
  const cantidad =
    labor.cantidad > 0 ? `${formatearCantidad(labor.cantidad)} ${labor.unidad ?? ''}`.trim() : null;
  const aviso =
    labor.sync_error === null
      ? descripcionDeEstado(labor.pending, null)
      : `. Sin sincronizar: ${labor.sync_error}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${resumen}${cantidad ? `, ${cantidad}` : ''}${aviso}. Editar`}
      accessibilityHint="Mantén presionado para duplicarla con la fecha de hoy"
      accessibilityActions={ACCIONES_ACCESIBLES.map((accion) => ({ ...accion }))}
      onAccessibilityAction={(evento) => {
        if (evento.nativeEvent.actionName === 'duplicar') alDuplicar(labor.id);
        if (evento.nativeEvent.actionName === 'borrar') alBorrar(labor.id);
      }}
      onPress={() => alEditar(labor.id)}
      className="min-h-[48px] flex-1 flex-row gap-3 focus:border-focus"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
        <Icono nombre={ICONO_TIPO[labor.tipo]} tono="primary" />
      </View>
      <TextosDeLabor labor={labor} cantidad={cantidad} nombreDeLote={nombreDeLote} />
    </Pressable>
  );
}

/** La foto que se muestra: la copia local o, si no la hay (otro teléfono la subió), la del servidor (D84). */
export const fotoDe = (labor: Pick<LaborFila, 'foto_uri' | 'foto_url'>): string | null =>
  labor.foto_uri ?? labor.foto_url;

/** Miniatura de la foto; tocarla la abre a pantalla completa. */
function MiniaturaDeFoto({
  uri,
  resumen,
  alAbrir,
}: {
  uri: string;
  resumen: string;
  alAbrir: () => void;
}) {
  const [fallida, setFallida] = useState(false);
  return (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={`Ver la foto de la ${resumen.toLowerCase()}`}
      onPress={alAbrir}
      className="min-h-[48px] min-w-[48px] justify-start"
    >
      {fallida ? (
        <Texto variante="ayuda">Foto no disponible</Texto>
      ) : (
        <Image
          testID="miniatura-foto"
          source={{ uri }}
          onError={() => setFallida(true)}
          accessibilityIgnoresInvertColors
          className="h-14 w-14 rounded-xl bg-surface-muted"
        />
      )}
    </Pressable>
  );
}

/** Duplicar (alternativa visible al gesto) y, aparte y en rojo, borrar. */
function MenuDeLabor({
  etiqueta,
  alDuplicar,
  alBorrar,
}: {
  etiqueta: string;
  alDuplicar: () => void;
  alBorrar: () => void;
}) {
  return (
    <MenuDeAcciones
      etiqueta={etiqueta}
      acciones={[
        { titulo: 'Duplicar con la fecha de hoy', icono: 'copy-outline', alPulsar: alDuplicar },
        { titulo: 'Borrar la labor', icono: 'trash-outline', alPulsar: alBorrar, peligro: true },
      ]}
    />
  );
}

/**
 * Una labor de la bitácora. Mantener presionada la fila la duplica con la fecha de hoy (gesto de la
 * sección 4); su alternativa visible es «Duplicar» en el menú ⋮, y para el lector de pantalla hay acciones
 * propias. Borrar va en el menú, lejos del resto (D105).
 */
export function FilaLabor({
  labor,
  alEditar,
  alDuplicar,
  alBorrar,
  alVerFoto,
  nombreDeLote,
}: FilaLaborProps) {
  const gesto = useLongPressGesture({
    runOnJS: true,
    testID: `gesto-duplicar-${labor.id}`,
    minDuration: DURACION_MANTENER_MS,
    onActivate: () => alDuplicar(labor.id),
  });
  const resumen = `Labor de ${ETIQUETA_TIPO[labor.tipo].toLowerCase()} del ${formatearFecha(labor.fecha)}`;

  return (
    <GestureDetector gesture={gesto}>
      <Tarjeta className="p-3">
        <View className="flex-row items-start gap-1">
          <CuerpoDeLabor
            labor={labor}
            resumen={resumen}
            nombreDeLote={nombreDeLote}
            alEditar={alEditar}
            alDuplicar={alDuplicar}
            alBorrar={alBorrar}
          />
          {fotoDe(labor) !== null && alVerFoto ? (
            <MiniaturaDeFoto
              uri={fotoDe(labor) ?? ''}
              resumen={resumen}
              alAbrir={() => alVerFoto(labor.id)}
            />
          ) : null}
          <MenuDeLabor
            etiqueta={`Más acciones de la ${resumen.toLowerCase()}`}
            alDuplicar={() => alDuplicar(labor.id)}
            alBorrar={() => alBorrar(labor.id)}
          />
        </View>
      </Tarjeta>
    </GestureDetector>
  );
}
