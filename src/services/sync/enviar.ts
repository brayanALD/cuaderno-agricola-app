import { ErrorApi } from '@/api/errores';
import type { CicloFila, LaborFila, LoteFila } from '@/db/modelo';
import type { Db } from '@/db/tipos';
import {
  listarCiclosPendientes,
  marcarCicloConError,
  marcarCicloSincronizado,
} from '@/repositories/cicloRepository';
import {
  listarLaboresPendientes,
  marcarLaborConError,
  marcarLaborSincronizada,
} from '@/repositories/laborRepository';
import {
  listarLotesPendientes,
  marcarLoteConError,
  marcarLoteSincronizado,
} from '@/repositories/loteRepository';
import type { Contexto } from '../contexto';
import { mensajeDeFila, type Entidad } from './errores';
import { borrarFotosPorBorrar, subirFotos } from './fotos';
import type { ClienteSync } from './tipos';

export interface ResumenEnvio {
  readonly enviados: number;
  /** Cambios que el servidor rechazó y quedaron con aviso. */
  readonly avisos: number;
}

interface Pendiente {
  readonly id: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

/** Cómo enviar un tipo de fila: qué hay pendiente, qué viaja y cómo marcarla. */
interface Envio<T extends Pendiente> {
  readonly entidad: Entidad;
  readonly recurso: 'lotes' | 'labores' | 'ciclos';
  readonly listar: (db: Db) => Promise<readonly T[]>;
  /** Solo los campos que acepta la API: nada de `pending`, `sync_error` ni `foto_uri`. */
  readonly cuerpo: (fila: T) => unknown;
  readonly marcarEnviada: (db: Db, id: string, actualizadoEn: string) => Promise<number>;
  readonly marcarConError: (
    db: Db,
    id: string,
    actualizadoEn: string,
    mensaje: string,
  ) => Promise<number>;
}

const LOTES: Envio<LoteFila> = {
  entidad: 'lote',
  recurso: 'lotes',
  listar: listarLotesPendientes,
  cuerpo: (l) => ({
    nombre: l.nombre,
    cultivo: l.cultivo,
    area_m2: l.area_m2,
    altitud_m: l.altitud_m,
    lat: l.lat,
    lng: l.lng,
    fecha_siembra: l.fecha_siembra,
    finca: l.finca,
  }),
  marcarEnviada: marcarLoteSincronizado,
  marcarConError: marcarLoteConError,
};

const LABORES: Envio<LaborFila> = {
  entidad: 'labor',
  recurso: 'labores',
  listar: listarLaboresPendientes,
  cuerpo: (l) => ({
    lote_id: l.lote_id,
    tipo: l.tipo,
    fecha: l.fecha,
    cantidad: l.cantidad,
    unidad: l.unidad,
    nota: l.nota,
    foto_url: l.foto_url,
    luz: l.luz,
    producto: l.producto,
    carencia_dias: l.carencia_dias,
    costo: l.costo,
  }),
  marcarEnviada: marcarLaborSincronizada,
  marcarConError: marcarLaborConError,
};

const CICLOS: Envio<CicloFila> = {
  entidad: 'ciclo',
  recurso: 'ciclos',
  listar: listarCiclosPendientes,
  cuerpo: (c) => ({
    lote_id: c.lote_id,
    cultivo: c.cultivo,
    fecha_inicio: c.fecha_inicio,
    fecha_fin: c.fecha_fin,
    total_kg: c.total_kg,
  }),
  marcarEnviada: marcarCicloSincronizado,
  marcarConError: marcarCicloConError,
};

/** `PUT` idempotente; un borrado que da 404 (el servidor nunca lo tuvo) también cuenta como hecho. */
async function enviarFila<T extends Pendiente>(
  cliente: ClienteSync,
  envio: Envio<T>,
  fila: T,
): Promise<void> {
  const ruta = `/api/${envio.recurso}/${fila.id}`;
  if (fila.deleted_at === null) {
    await cliente.pedir(ruta, { metodo: 'PUT', cuerpo: envio.cuerpo(fila) });
    return;
  }
  try {
    await cliente.pedir(ruta, { metodo: 'DELETE' });
  } catch (error) {
    if (!(error instanceof ErrorApi && error.status === 404)) throw error;
  }
}

async function enviarTipo<T extends Pendiente>(
  ctx: Contexto,
  cliente: ClienteSync,
  envio: Envio<T>,
): Promise<ResumenEnvio> {
  let enviados = 0;
  let avisos = 0;
  for (const fila of await envio.listar(ctx.db)) {
    try {
      await enviarFila(cliente, envio, fila);
      await envio.marcarEnviada(ctx.db, fila.id, fila.updated_at);
      enviados += 1;
    } catch (error) {
      // Si el error no es de esta fila (sin red, sesión…), `mensajeDeFila` lo relanza y corta la vuelta.
      const mensaje = mensajeDeFila(error, envio.entidad);
      await envio.marcarConError(ctx.db, fila.id, fila.updated_at, mensaje);
      avisos += 1;
    }
  }
  return { enviados, avisos };
}

/** Primero los lotes y luego sus ciclos y labores: el servidor exige que el lote exista. */
export async function enviarPendientes(ctx: Contexto, cliente: ClienteSync): Promise<ResumenEnvio> {
  const lotes = await enviarTipo(ctx, cliente, LOTES);
  const ciclos = await enviarTipo(ctx, cliente, CICLOS);
  // Las fotos suben antes que sus labores (llevan la URL) y las imágenes en desuso se borran al final (D83–D85).
  const fotos = await subirFotos(ctx, cliente);
  const labores = await enviarTipo(ctx, cliente, LABORES);
  await borrarFotosPorBorrar(ctx, cliente);
  return {
    enviados: lotes.enviados + ciclos.enviados + fotos.enviados + labores.enviados,
    avisos: lotes.avisos + ciclos.avisos + fotos.avisos + labores.avisos,
  };
}
