import { useCallback, useState } from 'react';
import { useCuaderno } from '@/context/CuadernoContext';
import { exportarReporte, type FormatoReporte } from '@/services/reporteService';

export interface Reporte {
  /** Formato que se está generando ahora, o `null`. */
  readonly generando: FormatoReporte | null;
  readonly error: string | null;
  readonly exportar: (formato: FormatoReporte) => Promise<void>;
}

/** Exporta la bitácora de un lote a PDF o Excel (D95). Nunca lanza: si falla deja un mensaje. */
export function useReporte(loteId: string): Reporte {
  const { ctx } = useCuaderno();
  const [generando, setGenerando] = useState<FormatoReporte | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportar = useCallback(
    async (formato: FormatoReporte) => {
      setGenerando(formato);
      setError(null);
      try {
        const resultado = await exportarReporte(ctx, loteId, formato);
        if (!resultado.ok) setError(resultado.errores.general ?? 'No se pudo generar el reporte.');
      } catch {
        setError('No se pudo generar el reporte. Inténtalo de nuevo.');
      } finally {
        setGenerando(null);
      }
    },
    [ctx, loteId],
  );

  return { generando, error, exportar };
}
