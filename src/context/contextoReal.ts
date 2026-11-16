import { randomUUID } from 'expo-crypto';
import { abrirBaseDeDatos, borrarBaseAntigua } from '@/db/expo';
import { fotosReal } from './fotosReal';
import { notificacionesReal } from './notificacionesReal';
import type { Contexto } from '@/services/contexto';
import { fechaLocalISO } from '@/services/fechas';

/**
 * Raíz de composición de la app para un usuario: su base real (expo-sqlite, D60), UUID de `expo-crypto`
 * (D33) y reloj del teléfono. Solo se prueba en un dispositivo.
 */
export async function abrirContextoReal(uid: string): Promise<Contexto> {
  await borrarBaseAntigua();
  const db = await abrirBaseDeDatos(uid);
  return {
    db,
    fotos: fotosReal,
    notificaciones: notificacionesReal,
    nuevoId: () => randomUUID(),
    ahora: () => new Date().toISOString(),
    hoy: () => fechaLocalISO(new Date()),
  };
}
