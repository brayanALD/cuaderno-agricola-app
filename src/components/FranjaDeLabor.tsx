import { View } from 'react-native';
import type { TipoLabor } from '@/db/modelo';
import {
  ETIQUETA_TIPO,
  estadoDeVencimiento,
  textoVencimiento,
  type EstadoDeVencimiento,
} from '@/services/etiquetas';
import { formatearFecha } from '@/services/fechas';
import type { TokenColor } from '@/theme/tokens';
import { Icono } from './Icono';
import { ICONO_TIPO } from './iconosDeLabor';
import { Insignia, type TonoInsignia } from './Insignia';
import { Texto } from './Texto';
import { unir } from './unir';

const ESTILO: Record<
  EstadoDeVencimiento,
  { franja: string; icono: string; tonoIcono: TokenColor; insignia: TonoInsignia }
> = {
  vencida: {
    franja: 'bg-danger-soft p-2',
    icono: 'bg-transparent',
    tonoIcono: 'danger',
    insignia: 'peligro',
  },
  hoy: { franja: '', icono: 'bg-accent', tonoIcono: 'onAccent', insignia: 'dorado' },
  proxima: { franja: '', icono: 'bg-surface-muted', tonoIcono: 'textMuted', insignia: 'neutro' },
};

const textoDeInsignia = (estado: EstadoDeVencimiento, diasRestantes: number): string => {
  if (estado === 'vencida') return 'Vencida';
  return textoVencimiento(diasRestantes);
};

export interface FranjaDeLaborProps {
  readonly tipo: TipoLabor;
  readonly fecha: string;
  readonly diasRestantes: number;
  /** Por defecto el nombre del tipo; en la pestaña Labores lleva también el lote. */
  readonly titulo?: string;
}

/**
 * Qué labor toca y cuándo (RF-03): icono, fecha y una insignia. Hoy es dorada; lo vencido, rojo suave con
 * icono y la palabra «Vencida» (nunca solo color); lo demás, neutro (D104). No es táctil: la envuelve su fila.
 */
export function FranjaDeLabor({ tipo, fecha, diasRestantes, titulo }: FranjaDeLaborProps) {
  const estado = estadoDeVencimiento(diasRestantes);
  const estilo = ESTILO[estado];
  return (
    <View className={unir('min-h-[48px] flex-row items-center gap-3 rounded-xl', estilo.franja)}>
      <View className={unir('h-10 w-10 items-center justify-center rounded-xl', estilo.icono)}>
        <Icono nombre={ICONO_TIPO[tipo]} tono={estilo.tonoIcono} />
      </View>
      <View className="flex-1">
        <Texto variante="etiqueta">{titulo ?? ETIQUETA_TIPO[tipo]}</Texto>
        <Texto variante="ayuda" tono={estado === 'vencida' ? 'peligro' : 'tenue'}>
          {estado === 'vencida' ? textoVencimiento(diasRestantes) : formatearFecha(fecha)}
        </Texto>
      </View>
      <Insignia
        tono={estilo.insignia}
        icono={estado === 'vencida' ? 'alert-circle-outline' : undefined}
      >
        {textoDeInsignia(estado, diasRestantes)}
      </Insignia>
    </View>
  );
}
