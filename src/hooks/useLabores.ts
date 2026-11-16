import { useCallback } from 'react';
import type { CicloFila, LaborFila } from '@/db/modelo';
import { buscarSoloLabores } from '@/services/busquedaService';
import type { Contexto } from '@/services/contexto';
import type { Carencia } from '@/services/carencia';
import { listarCiclos } from '@/services/cicloService';
import {
  carenciaDeLote,
  listarLaboresDeLote,
  listarLaboresRecientes,
  obtenerLabor,
  proximaLaborDeLote,
  proximasLaboresPorLote,
  type ProximaLabor,
} from '@/services/laborService';
import type { Sugerencia } from '@/services/proximaLabor';
import { produccionDeLote, type Produccion } from '@/services/produccionService';
import { listaVacia, useCarga, type Carga } from './useCarga';

/** Sin cosechas y sin costos no hay nada que mostrar. */
const sinCosechas = (produccion: Produccion): boolean =>
  produccion.porMes.length === 0 && produccion.costoTotal === 0;

/** Labores que contienen el texto en su tipo o su nota; conserva los resultados mientras se escribe. */
export function useBusquedaDeLabores(texto: string): Carga<LaborFila[]> {
  const cargar = useCallback((ctx: Contexto) => buscarSoloLabores(ctx, texto), [texto]);
  return useCarga(cargar, listaVacia, { conservarAlCambiar: true });
}

/** «Vacío» significa que la labor no existe (o fue borrada). */
export function useLabor(id: string): Carga<LaborFila> {
  const cargar = useCallback((ctx: Contexto) => obtenerLabor(ctx, id), [id]);
  return useCarga(cargar);
}

/** RF-03 para todos los lotes: qué labor toca primero en cada uno. */
export function useProximasLabores(): Carga<ProximaLabor[]> {
  return useCarga(proximasLaboresPorLote, listaVacia);
}

export function useLaboresDeLote(loteId: string): Carga<LaborFila[]> {
  const cargar = useCallback((ctx: Contexto) => listarLaboresDeLote(ctx, loteId), [loteId]);
  return useCarga(cargar, listaVacia);
}

export function useLaboresRecientes(limite = 20): Carga<LaborFila[]> {
  const cargar = useCallback((ctx: Contexto) => listarLaboresRecientes(ctx, limite), [limite]);
  return useCarga(cargar, listaVacia);
}

/** Total en kg del lote y por mes; «vacío» si todavía no hay cosechas. */
export function useProduccion(loteId: string): Carga<Produccion> {
  const cargar = useCallback((ctx: Contexto) => produccionDeLote(ctx, loteId), [loteId]);
  return useCarga(cargar, sinCosechas);
}

/** RF-03: próxima labor sugerida; «vacío» si el lote no existe. */
export function useProximaLabor(loteId: string): Carga<Sugerencia> {
  const cargar = useCallback((ctx: Contexto) => proximaLaborDeLote(ctx, loteId), [loteId]);
  return useCarga(cargar);
}

/** Periodo de carencia del lote (D95); «vacío» si ninguna labor lo tiene. */
export function useCarencia(loteId: string, excluirId?: string): Carga<Carencia> {
  const cargar = useCallback(
    (ctx: Contexto) => carenciaDeLote(ctx, loteId, excluirId),
    [loteId, excluirId],
  );
  return useCarga(cargar);
}

/** Ciclos de cultivo ya cerrados del lote (D95). */
export function useCiclos(loteId: string): Carga<CicloFila[]> {
  const cargar = useCallback((ctx: Contexto) => listarCiclos(ctx, loteId), [loteId]);
  return useCarga(cargar, listaVacia);
}
