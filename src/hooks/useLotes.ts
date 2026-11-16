import { useCallback } from 'react';
import type { LoteFila } from '@/db/modelo';
import { buscarEnCuaderno, type ResultadoBusqueda } from '@/services/busquedaService';
import type { Contexto } from '@/services/contexto';
import { listarLotesConDias, obtenerLote, type LoteConDias } from '@/services/loteService';
import { listaVacia, useCarga, type Carga } from './useCarga';

const sinResultados = (resultado: ResultadoBusqueda): boolean =>
  resultado.lotes.length === 0 && resultado.labores.length === 0;

/** Lotes con sus días desde la siembra; `texto` filtra por nombre o cultivo. */
export function useLotes(texto?: string): Carga<LoteConDias[]> {
  const cargar = useCallback((ctx: Contexto) => listarLotesConDias(ctx, texto), [texto]);
  return useCarga(cargar, listaVacia, { conservarAlCambiar: true });
}

/** «Vacío» significa que el lote no existe (o fue borrado). */
export function useLote(id: string): Carga<LoteFila> {
  const cargar = useCallback((ctx: Contexto) => obtenerLote(ctx, id), [id]);
  return useCarga(cargar);
}

export function useBusqueda(texto: string): Carga<ResultadoBusqueda> {
  const cargar = useCallback((ctx: Contexto) => buscarEnCuaderno(ctx, texto), [texto]);
  return useCarga(cargar, sinResultados, { conservarAlCambiar: true });
}
