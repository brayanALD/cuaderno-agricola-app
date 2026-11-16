import { useCuaderno } from '@/context/CuadernoContext';

/** Hoy en `AAAA-MM-DD` (calendario local), tomado del contexto para que las pruebas lo fijen. */
export function useHoy(): string {
  return useCuaderno().ctx.hoy();
}
