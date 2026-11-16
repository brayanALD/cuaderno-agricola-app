import { useCallback, useEffect, useState } from 'react';
import { useCuaderno } from '@/context/CuadernoContext';
import type { Contexto } from '@/services/contexto';
import { HORA_POR_DEFECTO } from '@/services/planRecordatorios';
import {
  activarRecordatorios,
  cambiarHoraRecordatorios,
  desactivarRecordatorios,
  leerConfigRecordatorios,
  MENSAJE_PERMISO_DENEGADO,
  reprogramarRecordatorios,
  type ConfigRecordatorios,
} from '@/services/recordatoriosService';
import { exito, type Resultado } from '@/services/resultado';

const INICIAL: ConfigRecordatorios = { activo: false, hora: HORA_POR_DEFECTO };

export interface Recordatorios {
  readonly config: ConfigRecordatorios;
  readonly error: string | null;
  /** El permiso está denegado: solo se arregla en los ajustes del teléfono (hay botón para abrirlos). */
  readonly sinPermiso: boolean;
  readonly alternar: (activar: boolean) => Promise<void>;
  readonly cambiarHora: (hora: string) => Promise<void>;
}

/**
 * Deja los avisos de riego al día: al abrir y tras CADA cambio de datos (propio o de la sincronización) se
 * reprograman. Nunca lanza: si falla, los avisos quedan como estaban. Va una sola vez dentro de la app.
 */
export function useReprogramarRecordatorios(): void {
  const { ctx, version } = useCuaderno();
  useEffect(() => {
    reprogramarRecordatorios(ctx).catch(() => undefined);
  }, [ctx, version]);
}

/** La config guardada de esta cuenta, leída al abrir el panel (mientras tanto, la de por defecto). */
function useConfigGuardada(ctx: Contexto) {
  const [config, setConfig] = useState<ConfigRecordatorios>(INICIAL);
  useEffect(() => {
    let vigente = true;
    leerConfigRecordatorios(ctx)
      .then((leida) => {
        if (vigente) setConfig(leida);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [ctx]);
  return [config, setConfig] as const;
}

/** Estado del panel «Recordatorio de riego» de Cuenta. */
export function useRecordatorios(): Recordatorios {
  const { ctx } = useCuaderno();
  const [config, setConfig] = useConfigGuardada(ctx);
  const [error, setError] = useState<string | null>(null);

  /** Ejecuta un cambio y lo refleja; un fallo del programa se muestra, no tumba la pantalla. */
  const intentar = useCallback(
    async (cambio: () => Promise<Resultado<ConfigRecordatorios>>, fallido: string) => {
      try {
        const resultado = await cambio();
        if (resultado.ok) setConfig(resultado.valor);
        setError(resultado.ok ? null : (Object.values(resultado.errores)[0] ?? fallido));
      } catch {
        setError(fallido);
      }
    },
    [setConfig],
  );

  const alternar = useCallback(
    (activar: boolean) =>
      intentar(
        () =>
          activar
            ? activarRecordatorios(ctx)
            : desactivarRecordatorios(ctx).then((config) => exito(config)),
        'No se pudo cambiar el recordatorio. Inténtalo de nuevo.',
      ),
    [ctx, intentar],
  );

  const cambiarHora = useCallback(
    (hora: string) =>
      intentar(
        () => cambiarHoraRecordatorios(ctx, hora),
        'No se pudo guardar la hora. Inténtalo de nuevo.',
      ),
    [ctx, intentar],
  );

  return { config, error, sinPermiso: error === MENSAJE_PERMISO_DENEGADO, alternar, cambiarHora };
}
