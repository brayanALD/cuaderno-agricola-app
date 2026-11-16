import type { ReactNode } from 'react';
import { CuadernoProvider } from '@/context/CuadernoContext';
import type { Contexto } from '@/services/contexto';

/** Envoltorio para `renderHook`: provee un contexto ya listo (base en memoria). */
export function crearEnvoltorio(ctx: Contexto) {
  const abrir = () => Promise.resolve(ctx);
  return function Envoltorio({ children }: { children: ReactNode }) {
    return (
      <CuadernoProvider abrir={abrir} cargando={null} alError={() => null}>
        {children}
      </CuadernoProvider>
    );
  };
}
