import { ScrollView, View } from 'react-native';
import type { SincronizacionValor } from '@/context/SincronizacionContext';
import { usePendientesDetalle } from '@/hooks/usePendientes';
import { formatearFechaHora } from '@/services/fechas';
import type { EstadoDePendiente, Pendiente } from '@/services/pendientesService';
import { Boton } from './Boton';
import { EsqueletoDeLabores } from './esqueletos';
import { HojaInferior } from './HojaInferior';
import { Icono } from './Icono';
import { Insignia, type TonoInsignia } from './Insignia';
import { Texto } from './Texto';
import { Vista } from './Vista';

const ESTADO: Record<
  EstadoDePendiente,
  {
    texto: string;
    tono: TonoInsignia;
    icono: 'cloud-upload-outline' | 'warning-outline' | 'alert-circle-outline';
  }
> = {
  pendiente: { texto: 'Pendiente', tono: 'neutro', icono: 'cloud-upload-outline' },
  aviso: { texto: 'Con aviso', tono: 'dorado', icono: 'warning-outline' },
  conflicto: { texto: 'Conflicto', tono: 'peligro', icono: 'alert-circle-outline' },
};

/** Un elemento que falta enviar: qué es, qué le pasó (si tiene aviso) y su estado con icono y palabra. */
function FilaDePendiente({ pendiente }: { readonly pendiente: Pendiente }) {
  const estado = ESTADO[pendiente.estado];
  return (
    <View
      accessible
      accessibilityLabel={`${pendiente.titulo}. ${pendiente.detalle}. ${estado.texto}${pendiente.aviso ? `: ${pendiente.aviso}` : ''}`}
      className="min-h-[56px] flex-row items-center gap-3 border-b border-divider py-2"
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-muted">
        <Icono
          nombre={pendiente.clase === 'lote' ? 'leaf-outline' : 'document-text-outline'}
          tono="textMuted"
        />
      </View>
      <View className="flex-1">
        <Texto variante="etiqueta">{pendiente.titulo}</Texto>
        <Texto variante="ayuda">{pendiente.detalle}</Texto>
        {pendiente.aviso ? (
          <Texto variante="ayuda" tono="peligro">
            {pendiente.aviso}
          </Texto>
        ) : null}
      </View>
      <Insignia tono={estado.tono} icono={estado.icono}>
        {estado.texto}
      </Insignia>
    </View>
  );
}

const resumenDe = (sync: SincronizacionValor): string => {
  if (sync.pendientes === 0) return 'Todo está sincronizado.';
  const cambios = sync.pendientes === 1 ? '1 por enviar' : `${String(sync.pendientes)} por enviar`;
  return sync.conAviso > 0 ? `${cambios} · ${String(sync.conAviso)} con aviso` : cambios;
};

export interface HojaDeSincronizacionProps {
  readonly sync: SincronizacionValor;
  readonly alCerrar: () => void;
}

/**
 * Qué falta enviar y por qué (D105): la lista con lo que necesita atención arriba, el estado de la conexión y
 * «Sincronizar ahora». Es una hoja, no una pantalla: se abre desde el aviso de cambios sin enviar y desde Cuenta.
 */
export function HojaDeSincronizacion({ sync, alCerrar }: HojaDeSincronizacionProps) {
  const pendientes = usePendientesDetalle();
  return (
    <HojaInferior visible titulo="Cambios sin enviar" alCerrar={alCerrar}>
      <Texto tono="tenue">{resumenDe(sync)}</Texto>
      <Vista
        carga={pendientes}
        esqueleto={<EsqueletoDeLabores />}
        vacio={{
          titulo: 'Todo está enviado',
          mensaje: 'No hay cambios pendientes en este teléfono.',
          icono: 'cloud-done-outline',
        }}
      >
        {(lista) => (
          <ScrollView className="max-h-[320px]">
            {lista.map((pendiente) => (
              <FilaDePendiente key={`${pendiente.clase}-${pendiente.id}`} pendiente={pendiente} />
            ))}
          </ScrollView>
        )}
      </Vista>
      {sync.enLinea ? null : <Texto tono="tenue">Sin conexión a internet.</Texto>}
      <Boton
        titulo="Sincronizar ahora"
        icono="sync-outline"
        variante="tonal"
        cargando={sync.sincronizando}
        onPress={() => void sync.sincronizarAhora()}
      />
      <Texto variante="ayuda" className="text-center">
        {sync.ultimaVez === null
          ? 'Aún no se ha sincronizado.'
          : `Última sincronización: ${formatearFechaHora(sync.ultimaVez)}`}
      </Texto>
    </HojaInferior>
  );
}
