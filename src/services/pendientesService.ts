import { TIPOS_LABOR, type TipoLabor } from '@/db/modelo';
import { listarPendientes, type FilaPendiente } from '@/repositories/estadoSyncRepository';
import type { Contexto } from './contexto';
import { ETIQUETA_TIPO } from './etiquetas';
import { formatearFecha } from './fechas';

/** Cuántos elementos se listan como máximo: más que esto no se lee en una hoja. */
export const LIMITE_DE_PENDIENTES = 50;

export type EstadoDePendiente = 'pendiente' | 'aviso' | 'conflicto';

/** Un elemento que falta enviar, listo para mostrar (D105). */
export interface Pendiente {
  readonly id: string;
  readonly clase: 'lote' | 'labor';
  /** «La Esperanza» o «Riego · La Esperanza». */
  readonly titulo: string;
  /** Una labor dice su fecha; un lote, si lo borraron. */
  readonly detalle: string;
  readonly estado: EstadoDePendiente;
  /** Por qué el servidor no lo aceptó, si tiene aviso. */
  readonly aviso: string | null;
}

const esTipo = (valor: string | null): valor is TipoLabor =>
  TIPOS_LABOR.some((tipo) => tipo === valor);

const estadoDe = (fila: FilaPendiente): EstadoDePendiente => {
  if (fila.conflicto === 1) return 'conflicto';
  return fila.aviso === null ? 'pendiente' : 'aviso';
};

/** Una fila de la base en palabras de agricultor. Función pura, con prueba. */
export function describirPendiente(fila: FilaPendiente): Pendiente {
  const tipo = esTipo(fila.tipo_labor) ? ETIQUETA_TIPO[fila.tipo_labor] : null;
  const accion = fila.borrado === 1 ? 'Borrado' : 'Cambio';
  return {
    id: fila.id,
    clase: fila.clase,
    titulo: tipo === null ? fila.lote : `${tipo} · ${fila.lote}`,
    detalle:
      fila.clase === 'labor' && fila.fecha !== null
        ? `${accion} · ${formatearFecha(fila.fecha)}`
        : `${accion} del lote`,
    estado: estadoDe(fila),
    aviso: fila.aviso,
  };
}

/** Lo que falta enviar, con lo que necesita atención primero. */
export async function listarPendientesDeEnvio(ctx: Contexto): Promise<Pendiente[]> {
  const filas = await listarPendientes(ctx.db, LIMITE_DE_PENDIENTES);
  return filas.map(describirPendiente);
}
