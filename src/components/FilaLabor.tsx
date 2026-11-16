import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { GestureDetector, useLongPressGesture } from 'react-native-gesture-handler';
import type { LaborFila, TipoLabor } from '@/db/modelo';
import { formatearCantidad } from '@/services/cantidad';
import { ETIQUETA_LUZ, ETIQUETA_TIPO } from '@/services/etiquetas';
import { formatearFecha } from '@/services/fechas';
import { AvisoDeSync } from './AvisoDeSync';
import { BotonIcono } from './BotonIcono';
import { Icono, type NombreIcono } from './Icono';
import { Insignia } from './Insignia';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

const ICONO_TIPO: Readonly<Record<TipoLabor, NombreIcono>> = {
  riego: 'water-outline',
  abono: 'flask-outline',
  fumigacion: 'color-wand-outline',
  poda: 'cut-outline',
  cosecha: 'basket-outline',
};

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
}

/** Datos de la labor; tocarlos la edita. */
function CuerpoDeLabor({ labor, resumen, nombreDeLote, alEditar }: CuerpoProps) {
  const cantidad =
    labor.cantidad > 0 ? `${formatearCantidad(labor.cantidad)} ${labor.unidad ?? ''}`.trim() : null;
  const aviso = labor.sync_error === null ? '' : `. Sin sincronizar: ${labor.sync_error}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${resumen}${cantidad ? `, ${cantidad}` : ''}${aviso}. Editar`}
      accessibilityHint="Mantén presionado para duplicarla con la fecha de hoy"
      onPress={() => alEditar(labor.id)}
      className="min-h-[48px] gap-1 focus:border-focus"
    >
      <View className="flex-row items-center gap-2">
        <Icono nombre={ICONO_TIPO[labor.tipo]} tono="primary" />
        <Texto variante="subtitulo" className="flex-1">
          {ETIQUETA_TIPO[labor.tipo]}
        </Texto>
        {cantidad ? <Texto variante="boton">{cantidad}</Texto> : null}
      </View>
      <Texto tono="tenue">{formatearFecha(labor.fecha)}</Texto>
      {nombreDeLote ? <Texto variante="ayuda">Lote: {nombreDeLote}</Texto> : null}
      {labor.nota ? <Texto>{labor.nota}</Texto> : null}
      {labor.luz ? <Insignia>{ETIQUETA_LUZ[labor.luz]}</Insignia> : null}
      <AvisoDeSync mensaje={labor.sync_error} />
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
      className="min-h-[48px] self-start"
    >
      {fallida ? (
        <Texto variante="ayuda">Foto no disponible</Texto>
      ) : (
        <Image
          testID="miniatura-foto"
          source={{ uri }}
          onError={() => setFallida(true)}
          accessibilityIgnoresInvertColors
          className="h-20 w-20 rounded-xl bg-surface-muted"
        />
      )}
    </Pressable>
  );
}

/**
 * Una labor de la bitácora. Mantener presionada la fila la duplica con la fecha de hoy (gesto de la
 * sección 4); el botón «Duplicar» hace exactamente lo mismo y es la alternativa accesible.
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
      <Tarjeta>
        <CuerpoDeLabor
          labor={labor}
          resumen={resumen}
          nombreDeLote={nombreDeLote}
          alEditar={alEditar}
        />
        {fotoDe(labor) !== null && alVerFoto ? (
          <MiniaturaDeFoto
            uri={fotoDe(labor) ?? ''}
            resumen={resumen}
            alAbrir={() => alVerFoto(labor.id)}
          />
        ) : null}
        <View className="flex-row justify-end gap-1">
          <BotonIcono
            icono="copy-outline"
            etiqueta={`Duplicar la ${resumen.toLowerCase()} con la fecha de hoy`}
            onPress={() => alDuplicar(labor.id)}
          />
          <BotonIcono
            icono="trash-outline"
            tono="danger"
            etiqueta={`Borrar la ${resumen.toLowerCase()}`}
            onPress={() => alBorrar(labor.id)}
          />
        </View>
      </Tarjeta>
    </GestureDetector>
  );
}
