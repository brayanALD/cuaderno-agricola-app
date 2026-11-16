import type { LaborRemota, LoteRemoto } from '@/db/modelo';
import type { Db } from '@/db/tipos';
import { guardarConflicto } from '@/repositories/conflictoRepository';
import { obtenerLabor } from '@/repositories/laborRepository';
import { obtenerLote } from '@/repositories/loteRepository';
import { MENSAJE_CONFLICTO } from './errores';

/** Versión de una fila que ya existe en el servidor pero cuya versión no se conoce (filas anteriores a D96). */
export const VERSION_DESCONOCIDA = '';

const CAMPOS_LOTE = [
  'nombre',
  'cultivo',
  'finca',
  'area_m2',
  'altitud_m',
  'lat',
  'lng',
  'fecha_siembra',
] as const;

const CAMPOS_LABOR = [
  'lote_id',
  'tipo',
  'fecha',
  'cantidad',
  'unidad',
  'nota',
  'foto_url',
  'luz',
  'producto',
  'carencia_dias',
  'costo',
] as const;

interface Local {
  readonly pending: 0 | 1;
  readonly version_servidor: string | null;
}

interface Remoto {
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

/**
 * ¿Otro teléfono cambió esta fila mientras aquí había cambios sin enviar? Solo si el servidor tiene una versión
 * distinta de la que esta fila conocía Y el contenido difiere (o lo borraron). Con el mismo contenido no hay nada
 * que decidir: pasa, por ejemplo, con el eco del propio envío (D96). `difiere` compara los campos.
 */
function chocan(local: Local, remoto: Remoto, difiere: () => boolean): boolean {
  if (local.pending === 0) return false;
  if (local.version_servidor === VERSION_DESCONOCIDA) return false;
  if (local.version_servidor === remoto.updated_at) return false;
  return remoto.deleted_at !== null || difiere();
}

/** Deja el lote local marcado en conflicto con lo del servidor. `false` si no había nada que decidir. */
export async function registrarConflictoDeLote(db: Db, remoto: LoteRemoto): Promise<boolean> {
  const local = await obtenerLote(db, remoto.id);
  if (local === null) return false;
  if (!chocan(local, remoto, () => CAMPOS_LOTE.some((campo) => local[campo] !== remoto[campo]))) {
    return false;
  }
  return (
    (await guardarConflicto(db, 'lote', remoto.id, JSON.stringify(remoto), MENSAJE_CONFLICTO)) > 0
  );
}

export async function registrarConflictoDeLabor(db: Db, remota: LaborRemota): Promise<boolean> {
  const local = await obtenerLabor(db, remota.id);
  if (local === null) return false;
  if (!chocan(local, remota, () => CAMPOS_LABOR.some((campo) => local[campo] !== remota[campo]))) {
    return false;
  }
  return (
    (await guardarConflicto(db, 'labor', remota.id, JSON.stringify(remota), MENSAJE_CONFLICTO)) > 0
  );
}
