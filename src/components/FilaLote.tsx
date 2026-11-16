import { Pressable, View } from 'react-native';
import { textoDias } from '@/services/etiquetas';
import type { LoteConDias } from '@/services/loteService';
import { AvisoDeSync } from './AvisoDeSync';
import { Insignia } from './Insignia';
import { Texto } from './Texto';

interface FilaLoteProps {
  readonly lote: LoteConDias;
  readonly alAbrir: (id: string) => void;
}

/** Fila de la lista de lotes con los días desde la siembra (criterio de aceptación 1). */
export function FilaLote({ lote, alAbrir }: FilaLoteProps) {
  const dias = textoDias(lote.dias_desde_siembra);
  const altitud = lote.altitud_m === null ? '' : ` · ${lote.altitud_m} m de altitud`;
  const aviso = lote.sync_error === null ? '' : `. Sin sincronizar: ${lote.sync_error}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lote ${lote.nombre}, ${lote.cultivo}, ${dias}${aviso}. Abrir`}
      onPress={() => alAbrir(lote.id)}
      className="min-h-[48px] gap-1 rounded-2xl border-2 border-border bg-surface p-4 active:bg-surface-muted focus:border-focus"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Texto variante="subtitulo" className="flex-1">
          {lote.nombre}
        </Texto>
        <Insignia>{dias}</Insignia>
      </View>
      <Texto tono="tenue">
        {lote.cultivo} · {lote.area_m2} m²{altitud}
      </Texto>
      <AvisoDeSync mensaje={lote.sync_error} />
    </Pressable>
  );
}
