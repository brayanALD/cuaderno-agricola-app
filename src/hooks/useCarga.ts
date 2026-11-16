import { useCallback, useEffect, useState } from 'react';
import { aError } from '@/context/aError';
import { useCuaderno } from '@/context/CuadernoContext';
import type { Contexto } from '@/services/contexto';

/** Los cuatro estados que toda pantalla que lee datos debe manejar (AGENTS.md). */
export type VistaCarga<T> =
  | { readonly estado: 'cargando' }
  | { readonly estado: 'vacio' }
  | { readonly estado: 'error'; readonly error: Error }
  | { readonly estado: 'listo'; readonly datos: T };

export interface Carga<T> {
  readonly vista: VistaCarga<T>;
  /** Vuelve a cargar después de un error (pasa por «cargando»). */
  readonly reintentar: () => void;
}

export interface OpcionesCarga {
  /** Al cambiar la consulta, seguir mostrando los datos anteriores hasta que lleguen los nuevos. */
  readonly conservarAlCambiar?: boolean;
}

export const listaVacia = (datos: readonly unknown[]): boolean => datos.length === 0;
const nuncaVacio = (): boolean => false;

function aVista<T>(datos: T | null, esVacio: (datos: T) => boolean): VistaCarga<T> {
  return datos === null || esVacio(datos) ? { estado: 'vacio' } : { estado: 'listo', datos };
}

/**
 * Lee datos con el contexto y los vuelve a leer cuando sube la versión (tras una escritura).
 * Al recargar por una escritura se conservan los datos viejos (sin parpadeo de «cargando»).
 * `null` significa «no encontrado» y se muestra como vacío.
 * `cargar` y `esVacio` deben ser referencias estables (`useCallback` o constantes del módulo).
 */
export function useCarga<T>(
  cargar: (ctx: Contexto) => Promise<T | null>,
  esVacio: (datos: T) => boolean = nuncaVacio,
  { conservarAlCambiar = false }: OpcionesCarga = {},
): Carga<T> {
  const { ctx, version } = useCuaderno();
  const [vista, setVista] = useState<VistaCarga<T>>({ estado: 'cargando' });
  const [intento, setIntento] = useState(0);
  const [consulta, setConsulta] = useState(() => cargar);

  // Otra consulta (otro lote): por defecto se vuelve a «cargando» para no mostrar datos del anterior.
  // El buscador pide conservar los resultados viejos mientras llegan los nuevos (sin parpadeo).
  if (consulta !== cargar) {
    setConsulta(() => cargar);
    if (!conservarAlCambiar) setVista({ estado: 'cargando' });
  }

  useEffect(() => {
    let vigente = true;
    cargar(ctx).then(
      (datos) => {
        if (vigente) setVista(aVista(datos, esVacio));
      },
      (error: unknown) => {
        if (vigente) setVista({ estado: 'error', error: aError(error) });
      },
    );
    return () => {
      vigente = false;
    };
  }, [ctx, cargar, esVacio, version, intento]);

  const reintentar = useCallback(() => {
    setVista({ estado: 'cargando' });
    setIntento((anterior) => anterior + 1);
  }, []);

  return { vista, reintentar };
}
