import { useState } from 'react';
import { View } from 'react-native';
import type { SincronizacionValor } from '@/context/SincronizacionContext';
import { formatearFechaHora } from '@/services/fechas';
import { Boton } from './Boton';
import { HojaDeSincronizacion } from './HojaDeSincronizacion';
import { Icono } from './Icono';
import { MensajeError } from './MensajeError';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

const textoUltima = (ultimaVez: string | null): string =>
  ultimaVez === null
    ? 'Aún no se ha sincronizado.'
    : `Última sincronización: ${formatearFechaHora(ultimaVez)}`;

const textoPendientes = (pendientes: number): string => {
  if (pendientes === 0) return 'Todo está sincronizado.';
  return `${String(pendientes)} ${pendientes === 1 ? 'cambio' : 'cambios'} por enviar.`;
};

const textoAvisos = (cantidad: number): string =>
  cantidad === 1
    ? '1 elemento no se pudo enviar. Ábrelo, corrígelo y se enviará solo.'
    : `${String(cantidad)} elementos no se pudieron enviar. Ábrelos, corrígelos y se enviarán solos.`;

/** El mensaje de la última vuelta solo si falló (y no mientras se está reintentando). */
function mensajeDeFallo({ sincronizando, resultado }: SincronizacionValor): string | undefined {
  if (sincronizando || resultado === null || resultado.ok) return undefined;
  return resultado.mensaje;
}

/**
 * Estado de la sincronización (D71, D104): una línea con icono («Todo está sincronizado» o cuántos cambios faltan),
 * cuándo fue la última, qué falló, «Sincronizar ahora» y, si algo falta, «Ver qué falta» (la hoja, D105).
 */
export function PanelSincronizacion({ sync }: { readonly sync: SincronizacionValor }) {
  const [hoja, setHoja] = useState(false);
  const alDia = sync.pendientes === 0;
  return (
    <Tarjeta>
      <Texto variante="subtitulo">Sincronización</Texto>
      <View className="flex-row items-center gap-2">
        <Icono
          nombre={alDia ? 'cloud-done-outline' : 'cloud-upload-outline'}
          tono={alDia ? 'success' : 'textMuted'}
        />
        <Texto variante="etiqueta" className="flex-1">
          {textoPendientes(sync.pendientes)}
        </Texto>
      </View>
      {sync.sincronizando ? <Texto>Sincronizando…</Texto> : null}
      <MensajeError texto={mensajeDeFallo(sync)} />
      <Texto tono="tenue">{textoUltima(sync.ultimaVez)}</Texto>
      {sync.enLinea ? null : <Texto tono="tenue">Sin conexión a internet.</Texto>}
      <MensajeError texto={sync.conAviso > 0 ? textoAvisos(sync.conAviso) : undefined} />
      <Boton
        titulo="Sincronizar ahora"
        variante="tonal"
        icono="sync-outline"
        cargando={sync.sincronizando}
        onPress={() => void sync.sincronizarAhora()}
      />
      {alDia ? null : (
        <Boton
          titulo="Ver qué falta"
          variante="texto"
          icono="list-outline"
          onPress={() => setHoja(true)}
        />
      )}
      {hoja ? <HojaDeSincronizacion sync={sync} alCerrar={() => setHoja(false)} /> : null}
    </Tarjeta>
  );
}
