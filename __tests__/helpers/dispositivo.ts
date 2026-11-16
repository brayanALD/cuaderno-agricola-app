import type { Contexto } from '@/services/contexto';
import { crearContextoDePrueba } from './contexto';

/**
 * Un teléfono para las pruebas: su propia base SQLite en memoria, ids con su nombre (dos teléfonos
 * nunca generan el mismo UUID) y un reloj que se mueve a mano (`avanzar`).
 */
export async function crearDispositivo(nombre = 'a', inicio = '2026-11-14T15:00:00.000Z') {
  const base = await crearContextoDePrueba();
  let reloj = Date.parse(inicio);
  let contador = 0;
  const ctx: Contexto = {
    ...base,
    nuevoId: () => `${nombre}-${String(++contador)}`,
    ahora: () => new Date(reloj).toISOString(),
  };
  return {
    ctx,
    avanzar: (milisegundos = 1000) => {
      reloj += milisegundos;
    },
  };
}

export type Dispositivo = Awaited<ReturnType<typeof crearDispositivo>>;
