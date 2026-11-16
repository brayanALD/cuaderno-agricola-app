import { useCallback, useEffect, useState } from 'react';
import { useCuaderno } from '@/context/CuadernoContext';
import { consejoVisto, marcarConsejoVisto } from '@/services/ajustesService';

export interface Consejo {
  /** Verdadero solo cuando ya se leyó que NO se ha visto (nunca parpadea mientras se lee). */
  readonly visible: boolean;
  readonly descartar: () => void;
}

/** Un consejo de una sola vez: aparece hasta que se descarta y entonces no vuelve (D105). */
export function useConsejo(clave: string): Consejo {
  const { ctx } = useCuaderno();
  const [visto, setVisto] = useState<boolean | null>(null);

  useEffect(() => {
    let vigente = true;
    consejoVisto(ctx, clave).then(
      (leido) => {
        if (vigente) setVisto(leido);
      },
      // Si no se puede leer, mejor no insistir con un consejo.
      () => {
        if (vigente) setVisto(true);
      },
    );
    return () => {
      vigente = false;
    };
  }, [ctx, clave]);

  const descartar = useCallback(() => {
    setVisto(true);
    marcarConsejoVisto(ctx, clave).catch(() => undefined);
  }, [ctx, clave]);

  return { visible: visto === false, descartar };
}
