import { useState } from 'react';
import { useSincronizacion } from '@/context/SincronizacionContext';
import { usePendientes } from '@/hooks/usePendientes';
import { Banner } from './Banner';
import { HojaDeSincronizacion } from './HojaDeSincronizacion';

const textoCambios = (cantidad: number): string =>
  cantidad === 1 ? '1 cambio sin enviar' : `${String(cantidad)} cambios sin enviar`;

const textoAvisos = (cantidad: number): string => {
  if (cantidad === 0) return '';
  return cantidad === 1
    ? ' 1 tiene un aviso: ábrelo para corregirlo.'
    : ` ${String(cantidad)} tienen un aviso: ábrelos para corregirlos.`;
};

/** La hoja se monta solo al abrirla: así el aviso funciona aunque no haya proveedor de sincronización. */
function HojaConSincronizacion({ alCerrar }: { readonly alCerrar: () => void }) {
  return <HojaDeSincronizacion sync={useSincronizacion()} alCerrar={alCerrar} />;
}

/**
 * Aviso global (D99): cuántos cambios faltan enviar al servidor y cuántos tienen aviso. «Ver» abre la hoja que
 * dice cuáles son y por qué (D105). Sin nada pendiente no pinta nada; mientras carga o si falla la lectura
 * tampoco (es informativo, no debe estorbar).
 */
export function AvisoDePendientes() {
  const { vista } = usePendientes();
  const [abierta, setAbierta] = useState(false);
  if (vista.estado !== 'listo') return null;
  const { pendientes, conAviso } = vista.datos;
  if (pendientes === 0 && conAviso === 0) return null;
  return (
    <>
      <Banner
        icono="cloud-upload-outline"
        titulo={textoCambios(pendientes)}
        texto={`Se enviarán solos cuando haya conexión.${textoAvisos(conAviso)}`}
        accion={{
          titulo: 'Ver',
          etiqueta: 'Ver qué falta enviar',
          alPulsar: () => setAbierta(true),
        }}
      />
      {abierta ? <HojaConSincronizacion alCerrar={() => setAbierta(false)} /> : null}
    </>
  );
}
