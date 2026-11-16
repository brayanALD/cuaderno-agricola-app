import type { Contexto } from '@/services/contexto';
import { AHORA } from './filas';
import { crearDbMigrada } from './baseEnMemoria';
import { crearFotosEnMemoria } from './fotosEnMemoria';
import { crearNotificacionesEnMemoria } from './notificacionesEnMemoria';

export const HOY = '2026-11-14';

/** Contexto con SQLite en memoria, ids `id-1`, `id-2`… y reloj fijo. */
export async function crearContextoDePrueba(): Promise<Contexto> {
  const db = await crearDbMigrada();
  let contador = 0;
  return {
    db,
    fotos: crearFotosEnMemoria(),
    notificaciones: crearNotificacionesEnMemoria(),
    nuevoId: () => `id-${++contador}`,
    ahora: () => AHORA,
    hoy: () => HOY,
  };
}

export const datosLote = (cambios: Record<string, unknown> = {}) => ({
  nombre: 'El Mirador',
  cultivo: 'Café',
  area_m2: 5000,
  altitud_m: 1650,
  lat: 4.65,
  lng: -75.57,
  fecha_siembra: '2026-08-16',
  ...cambios,
});

export const datosLabor = (cambios: Record<string, unknown> = {}) => ({
  tipo: 'riego',
  fecha: '2026-11-10',
  cantidad: 20,
  unidad: 'L',
  nota: null,
  luz: null,
  ...cambios,
});
