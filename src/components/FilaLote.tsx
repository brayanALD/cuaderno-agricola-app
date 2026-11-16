import { Pressable, View } from 'react-native';
import { ETIQUETA_TIPO, textoDias, textoVencimiento } from '@/services/etiquetas';
import type { LoteConDias } from '@/services/loteService';
import type { Sugerencia } from '@/services/proximaLabor';
import { AvisoDeSync } from './AvisoDeSync';
import { descripcionDeEstado, EstadoDeFila } from './EstadoDeFila';
import { FranjaDeLabor } from './FranjaDeLabor';
import { Insignia } from './Insignia';
import { Texto } from './Texto';

interface FilaLoteProps {
  readonly lote: LoteConDias;
  /** Lo que toca hacer en este lote (RF-03): responde «¿qué toca hoy?» sin abrirlo. */
  readonly proxima?: Sugerencia;
  readonly alAbrir: (id: string) => void;
}

/** Fila de la lista de lotes con los días desde la siembra (criterio de aceptación 1) y su próxima labor. */
export function FilaLote({ lote, proxima, alAbrir }: FilaLoteProps) {
  const dias = textoDias(lote.dias_desde_siembra);
  const altitud = lote.altitud_m === null ? '' : ` · ${lote.altitud_m} m de altitud`;
  const finca = lote.finca === null ? '' : `${lote.finca} · `;
  const sugerida = proxima
    ? `, próxima labor: ${ETIQUETA_TIPO[proxima.tipo]}, ${textoVencimiento(proxima.diasRestantes)}`
    : '';
  const aviso =
    lote.sync_error === null
      ? descripcionDeEstado(lote.pending, null)
      : `. Sin sincronizar: ${lote.sync_error}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Lote ${lote.nombre}, ${finca === '' ? '' : `finca ${lote.finca ?? ''}, `}${lote.cultivo}, ${dias}${sugerida}${aviso}. Abrir`}
      onPress={() => alAbrir(lote.id)}
      className="min-h-[48px] gap-1 rounded-2xl border-2 border-divider bg-surface p-4 active:bg-surface-muted focus:border-focus"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Texto variante="subtitulo" className="flex-1">
          {lote.nombre}
        </Texto>
        <Insignia tono="neutro">{dias}</Insignia>
      </View>
      <Texto tono="tenue">
        {finca}
        {lote.cultivo} · {lote.area_m2} m²{altitud}
      </Texto>
      {proxima ? (
        <View className="mt-2">
          <FranjaDeLabor
            tipo={proxima.tipo}
            fecha={proxima.fecha}
            diasRestantes={proxima.diasRestantes}
          />
        </View>
      ) : null}
      <EstadoDeFila pending={lote.pending} syncError={lote.sync_error} />
      <AvisoDeSync mensaje={lote.sync_error} />
    </Pressable>
  );
}
