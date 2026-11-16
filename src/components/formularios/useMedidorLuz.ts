import { useCallback, useEffect, useRef, useState } from 'react';
import type { Luz } from '@/db/modelo';
import { clasificarLuz } from '@/sensors/luz';
import { medirLuz, type ResultadoLuz } from '@/sensors/medirLuz';
import { ETIQUETA_LUZ } from '@/services/etiquetas';

const MENSAJE_SIN_SENSOR = 'Este teléfono no tiene sensor de luz. Elige la opción a mano.';
const MENSAJE_SIN_LECTURA = 'No se obtuvo una lectura del sensor. Elige la opción a mano.';

export interface MedidorDeLuz {
  readonly midiendo: boolean;
  /** Lo que midió (para anunciarlo) o `null`. */
  readonly resultado: string | null;
  readonly error: string | null;
  readonly iniciar: () => void;
}

/**
 * Estado de la medición de luz de un formulario. Mide solo cuando el usuario lo pide y aborta la
 * medición pendiente al salir de la pantalla (así el sensor no queda suscrito).
 */
export function useMedidorLuz(alMedir: (luz: Luz) => void): MedidorDeLuz {
  const [midiendo, setMidiendo] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const control = useRef<AbortController | null>(null);

  useEffect(() => () => control.current?.abort(), []);

  const aplicar = useCallback(
    (medida: ResultadoLuz) => {
      if (medida.tipo === 'cancelada') return;
      setMidiendo(false);
      if (medida.tipo === 'sin-sensor') setError(MENSAJE_SIN_SENSOR);
      else if (medida.tipo === 'sin-lectura') setError(MENSAJE_SIN_LECTURA);
      else {
        const luz = clasificarLuz(medida.lux);
        setResultado(`Luz medida: ${Math.round(medida.lux)} lx → ${ETIQUETA_LUZ[luz]}.`);
        alMedir(luz);
      }
    },
    [alMedir],
  );

  const iniciar = useCallback(() => {
    control.current?.abort();
    const nuevo = new AbortController();
    control.current = nuevo;
    setResultado(null);
    setError(null);
    setMidiendo(true);
    void medirLuz(nuevo.signal).then(aplicar);
  }, [aplicar]);

  return { midiendo, resultado, error, iniciar };
}
