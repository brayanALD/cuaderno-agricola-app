import { useState } from 'react';
import { ajustarCantidad, formatearCantidad } from '@/services/cantidad';
import { useGestoCantidad } from './useGestoCantidad';

interface Opciones {
  readonly valor: number;
  readonly onChange: (cantidad: number) => void;
  readonly paso: number;
  readonly max?: number;
}

/**
 * Estado del control de cantidad: el texto que se está escribiendo (puede ser inválido a medias),
 * el gesto de arrastre y los botones «−» y «+». Solo se emite un valor si es un número ≥ 0.
 */
export function useControlCantidad({ valor, onChange, paso, max }: Opciones) {
  const [escrito, setEscrito] = useState<string | null>(null);

  const gesto = useGestoCantidad({
    valor,
    paso,
    max,
    alCambiar: (cantidad) => {
      setEscrito(null);
      onChange(cantidad);
    },
  });

  const escribir = (texto: string) => {
    setEscrito(texto);
    const numero = Number(texto.replace(',', '.'));
    if (texto.trim() !== '' && Number.isFinite(numero) && numero >= 0) onChange(numero);
  };

  const cambiar = (pasos: number) => {
    setEscrito(null);
    onChange(ajustarCantidad(valor, pasos, paso, max));
  };

  return {
    texto: escrito ?? formatearCantidad(valor),
    gesto,
    escribir,
    cambiar,
    alSalir: () => setEscrito(null),
  };
}
