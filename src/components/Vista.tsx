import type { ReactNode } from 'react';
import type { Carga } from '@/hooks/useCarga';
import { Cargando, ErrorConReintento, Vacio, type VacioProps } from './Estados';

interface VistaProps<T> {
  readonly carga: Carga<T>;
  readonly vacio: VacioProps;
  readonly children: (datos: T) => ReactNode;
}

/** Resuelve los 4 estados de una lectura (carga, vacío, error con reintento, listo) en un solo lugar. */
export function Vista<T>({ carga, vacio, children }: VistaProps<T>) {
  const { vista, reintentar } = carga;
  switch (vista.estado) {
    case 'cargando':
      return <Cargando />;
    case 'vacio':
      return <Vacio {...vacio} />;
    case 'error':
      return <ErrorConReintento mensaje={vista.error.message} reintentar={reintentar} />;
    case 'listo':
      return <>{children(vista.datos)}</>;
  }
}
