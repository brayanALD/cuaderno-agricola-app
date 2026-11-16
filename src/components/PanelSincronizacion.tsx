import type { SincronizacionValor } from '@/context/SincronizacionContext';
import { formatearFechaHora } from '@/services/fechas';
import { Boton } from './Boton';
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

/** Estado de la sincronización (D71): cuándo fue, qué falta enviar, qué falló y el botón para forzarla. */
export function PanelSincronizacion({ sync }: { readonly sync: SincronizacionValor }) {
  return (
    <Tarjeta>
      <Texto variante="subtitulo">Sincronización</Texto>
      {sync.sincronizando ? <Texto>Sincronizando…</Texto> : null}
      <MensajeError texto={mensajeDeFallo(sync)} />
      <Texto>{textoUltima(sync.ultimaVez)}</Texto>
      <Texto>{textoPendientes(sync.pendientes)}</Texto>
      {sync.enLinea ? null : <Texto tono="tenue">Sin conexión a internet.</Texto>}
      <MensajeError texto={sync.conAviso > 0 ? textoAvisos(sync.conAviso) : undefined} />
      <Boton
        titulo="Sincronizar ahora"
        variante="secundario"
        icono="sync-outline"
        cargando={sync.sincronizando}
        onPress={() => void sync.sincronizarAhora()}
      />
    </Tarjeta>
  );
}
