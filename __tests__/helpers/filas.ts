import type { LaborFila, LoteFila } from '@/db/modelo';

export const AHORA = '2026-11-14T15:00:00.000Z';

export function loteFila(cambios: Partial<LoteFila> = {}): LoteFila {
  return {
    id: 'lote-1',
    nombre: 'El Mirador',
    cultivo: 'Café',
    area_m2: 5000,
    altitud_m: 1650,
    lat: 4.65,
    lng: -75.57,
    fecha_siembra: '2026-08-16',
    created_at: AHORA,
    updated_at: AHORA,
    deleted_at: null,
    pending: 1,
    sync_error: null,
    ...cambios,
  };
}

export function laborFila(cambios: Partial<LaborFila> = {}): LaborFila {
  return {
    id: 'labor-1',
    lote_id: 'lote-1',
    tipo: 'riego',
    fecha: '2026-11-10',
    cantidad: 20,
    unidad: 'L',
    nota: null,
    foto_uri: null,
    foto_url: null,
    luz: null,
    created_at: AHORA,
    updated_at: AHORA,
    deleted_at: null,
    pending: 1,
    sync_error: null,
    ...cambios,
  };
}
