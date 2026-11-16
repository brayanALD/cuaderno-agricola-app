import { z } from 'zod';
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
import { VERSION_DESCONOCIDA } from './conflictos';
import { mensajeDeFila, type Entidad } from './errores';
import { borrarFotosPorBorrar, subirFotos } from './fotos';
import type { ClienteSync } from './tipos';

export interface ResumenEnvio {
  readonly enviados: number;
  /** Cambios que el servidor rechazó y quedaron con aviso. */
  readonly avisos: number;
}

/** Cambios por viaje (D98): el máximo que acepta `POST /api/sync`. */
const MAXIMO_POR_VIAJE = 50;

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
  /** `version` es el `updated_at` que puso el servidor, si lo dijo (D96). */
  readonly marcarEnviada: (
    db: Db,
    id: string,
    actualizadoEn: string,
    version: string | null,
  ) => Promise<number>;
  readonly marcarConError: (
    db: Db,
    id: string,
    actualizadoEn: string,
    mensaje: string,
  ) => Promise<number>;
}

/**
 * La versión del servidor que esta fila conocía, para que la API detecte si otro teléfono la cambió (D96). Si no
 * se conoce (filas anteriores a esa función) no se envía y gana la última escritura, como siempre.
 */
const versionBase = (fila: { readonly version_servidor: string | null }) =>
  fila.version_servidor === VERSION_DESCONOCIDA ? {} : { base_updated_at: fila.version_servidor };

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
    ...versionBase(l),
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
    ...versionBase(l),
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
  marcarEnviada: (db, id, actualizadoEn) => marcarCicloSincronizado(db, id, actualizadoEn),
  marcarConError: marcarCicloConError,
};

/** Resultado de UN cambio: el código que habría dado su `PUT` o `DELETE` suelto. */
const resultadoSchema = z.object({
  estado: z.number().int(),
  updated_at: z.string().optional(),
  error: z.string().optional(),
  detalles: z.array(z.object({ campo: z.string(), mensaje: z.string() })).optional(),
});
type Resultado = z.infer<typeof resultadoSchema>;

const respuestaDelViaje = z.object({ resultados: z.array(resultadoSchema) });
const documentoGuardado = z.object({ updated_at: z.string() });

const SIN_RESULTADO: Resultado = { estado: 502, error: 'Respuesta inesperada del servidor.' };

/** Cuál se usa en esta vuelta: `POST /api/sync`, o `PUT`/`DELETE` sueltos si el servidor es anterior (D98). */
interface Via {
  porViaje: boolean;
}

function cambioDe<T extends Pendiente>(envio: Envio<T>, fila: T) {
  const base = { recurso: envio.recurso, id: fila.id };
  return fila.deleted_at === null
    ? { ...base, cuerpo: envio.cuerpo(fila) }
    : { ...base, borrado: true };
}

async function enviarViaje<T extends Pendiente>(
  cliente: ClienteSync,
  envio: Envio<T>,
  grupo: readonly T[],
): Promise<Resultado[]> {
  const cuerpo = { cambios: grupo.map((fila) => cambioDe(envio, fila)) };
  const respuesta = respuestaDelViaje.safeParse(
    await cliente.pedir('/api/sync', { metodo: 'POST', cuerpo }),
  );
  if (!respuesta.success || respuesta.data.resultados.length !== grupo.length) {
    throw new ErrorApi(502, 'Respuesta inesperada del servidor.');
  }
  return respuesta.data.resultados;
}

/** `PUT` o `DELETE` de una sola fila. Un error de la API es su resultado; sin red, el error sube y corta la vuelta. */
async function enviarFila<T extends Pendiente>(
  cliente: ClienteSync,
  envio: Envio<T>,
  fila: T,
): Promise<Resultado> {
  const ruta = `/api/${envio.recurso}/${fila.id}`;
  try {
    if (fila.deleted_at !== null) {
      await cliente.pedir(ruta, { metodo: 'DELETE' });
      return { estado: 200 };
    }
    const guardado = documentoGuardado.safeParse(
      await cliente.pedir(ruta, { metodo: 'PUT', cuerpo: envio.cuerpo(fila) }),
    );
    return { estado: 200, updated_at: guardado.success ? guardado.data.updated_at : undefined };
  } catch (error) {
    if (!(error instanceof ErrorApi)) throw error;
    return { estado: error.status, error: error.message, detalles: [...error.detalles] };
  }
}

/**
 * Envía un grupo. `null` = el servidor no tiene `POST /api/sync` (404: es anterior): desde ahora se envía fila por
 * fila, y quien llama vuelve a intentar con grupos de una (así lo ya enviado se anota antes de seguir).
 */
async function enviarGrupo<T extends Pendiente>(
  cliente: ClienteSync,
  via: Via,
  envio: Envio<T>,
  grupo: readonly T[],
): Promise<Resultado[] | null> {
  if (via.porViaje) {
    try {
      return await enviarViaje(cliente, envio, grupo);
    } catch (error) {
      if (!(error instanceof ErrorApi && error.status === 404)) throw error;
      via.porViaje = false;
      return null;
    }
  }
  const resultados: Resultado[] = [];
  for (const fila of grupo) resultados.push(await enviarFila(cliente, envio, fila));
  return resultados;
}

/** Aplica el resultado a la fila. `true` = enviada; `false` = quedó con aviso. Un error general se relanza. */
async function registrar<T extends Pendiente>(
  ctx: Contexto,
  envio: Envio<T>,
  fila: T,
  resultado: Resultado,
): Promise<boolean> {
  // Un borrado que da 404 (el servidor nunca lo tuvo) también cuenta como hecho.
  const hecho = resultado.estado === 200 || (fila.deleted_at !== null && resultado.estado === 404);
  if (hecho) {
    await envio.marcarEnviada(ctx.db, fila.id, fila.updated_at, resultado.updated_at ?? null);
    return true;
  }
  const error = new ErrorApi(resultado.estado, resultado.error ?? '', resultado.detalles ?? []);
  // Si el error no es de esta fila (sesión, servidor…), `mensajeDeFila` lo relanza y corta la vuelta.
  const mensaje = mensajeDeFila(error, envio.entidad);
  await envio.marcarConError(ctx.db, fila.id, fila.updated_at, mensaje);
  return false;
}

async function enviarTipo<T extends Pendiente>(
  ctx: Contexto,
  cliente: ClienteSync,
  via: Via,
  envio: Envio<T>,
): Promise<ResumenEnvio> {
  let enviados = 0;
  let avisos = 0;
  const filas = await envio.listar(ctx.db);
  for (let desde = 0; desde < filas.length;) {
    const grupo = filas.slice(desde, desde + (via.porViaje ? MAXIMO_POR_VIAJE : 1));
    const resultados = await enviarGrupo(cliente, via, envio, grupo);
    if (resultados === null) continue;
    for (const [indice, fila] of grupo.entries()) {
      const resultado = resultados[indice] ?? SIN_RESULTADO;
      if (await registrar(ctx, envio, fila, resultado)) enviados += 1;
      else avisos += 1;
    }
    desde += grupo.length;
  }
  return { enviados, avisos };
}

/** Primero los lotes y luego sus ciclos y labores: el servidor exige que el lote exista. */
export async function enviarPendientes(ctx: Contexto, cliente: ClienteSync): Promise<ResumenEnvio> {
  const via: Via = { porViaje: true };
  const lotes = await enviarTipo(ctx, cliente, via, LOTES);
  const ciclos = await enviarTipo(ctx, cliente, via, CICLOS);
  // Las fotos suben antes que sus labores (llevan la URL) y las imágenes en desuso se borran al final (D83–D85).
  const fotos = await subirFotos(ctx, cliente);
  const labores = await enviarTipo(ctx, cliente, via, LABORES);
  await borrarFotosPorBorrar(ctx, cliente);
  return {
    enviados: lotes.enviados + ciclos.enviados + fotos.enviados + labores.enviados,
    avisos: lotes.avisos + ciclos.avisos + fotos.avisos + labores.avisos,
  };
}
