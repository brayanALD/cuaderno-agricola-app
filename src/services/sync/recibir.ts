import { ErrorApi } from '@/api/errores';
import type { LoteRemoto } from '@/db/modelo';
import type { Db } from '@/db/tipos';
import { guardarEstadoSync, leerEstadoSync } from '@/repositories/estadoSyncRepository';
import { guardarCicloRemoto } from '@/repositories/cicloRepository';
import { leerFotoUri } from '@/repositories/fotoRepository';
import { guardarLaborRemota } from '@/repositories/laborRepository';
import {
  buscarLoteVivoConNombre,
  existeLoteConId,
  guardarLoteRemoto,
  marcarLoteConError,
} from '@/repositories/loteRepository';
import type { Contexto } from '../contexto';
import { registrarConflictoDeLabor, registrarConflictoDeLote } from './conflictos';
import { MENSAJE_NOMBRE_REPETIDO } from './errores';
import {
  cicloRemotoSchema,
  laborRemotaSchema,
  loteRemotoSchema,
  marcaSchema,
  paginaSchema,
} from './esquemasRemotos';
import { LIMITE_POR_LLAMADA, type ClienteSync } from './tipos';

export interface ResumenRecibo {
  readonly aplicados: number;
  readonly descartados: number;
  /** Lotes locales que quedaron con aviso porque su nombre choca con uno que llegó del servidor. */
  readonly avisos: number;
}

type Resultado =
  'aplicado' | 'aplicado-con-aviso' | 'omitido' | 'descartado' | 'huerfana' | 'conflicto';
/** `limpieza` junta las copias de fotos que dejan de valer: se borran DESPUÉS de confirmar la transacción. */
type Aplicar = (db: Db, item: unknown, limpieza: string[]) => Promise<Resultado>;

/**
 * Otro lote vivo con el mismo nombre. `descartar`: el otro ya está sincronizado, este no entra. `aviso`: el otro
 * tiene cambios sin enviar y queda con aviso (D73). `libre`: no hay choque.
 */
async function chocarConNombre(
  db: Db,
  remoto: LoteRemoto,
): Promise<'descartar' | 'aviso' | 'libre'> {
  const choque = await buscarLoteVivoConNombre(db, remoto.nombre, remoto.id);
  if (choque === null) return 'libre';
  if (choque.pending === 0) return 'descartar';
  await marcarLoteConError(db, choque.id, choque.updated_at, MENSAJE_NOMBRE_REPETIDO);
  return 'aviso';
}

/**
 * Un lote que llega del servidor. Gana lo pendiente de este teléfono (el `WHERE` del repositorio): se
 * enviará en la próxima vuelta, salvo que otro teléfono lo haya cambiado: entonces queda en conflicto y el
 * usuario elige (D96). Un borrado de un lote que nunca estuvo aquí no se guarda.
 */
const aplicarLote: Aplicar = async (db, item) => {
  const analisis = loteRemotoSchema.safeParse(item);
  if (!analisis.success) return 'descartado';
  const remoto = analisis.data;
  if (remoto.deleted_at !== null && !(await existeLoteConId(db, remoto.id))) return 'omitido';
  const choque = remoto.deleted_at === null ? await chocarConNombre(db, remoto) : 'libre';
  if (choque === 'descartar') return 'descartado';
  if ((await guardarLoteRemoto(db, remoto)) === 0) {
    return (await registrarConflictoDeLote(db, remoto)) ? 'conflicto' : 'omitido';
  }
  return choque === 'aviso' ? 'aplicado-con-aviso' : 'aplicado';
};

const aplicarLabor: Aplicar = async (db, item, limpieza) => {
  const analisis = laborRemotaSchema.safeParse(item);
  if (!analisis.success) return 'descartado';
  const remota = analisis.data;
  if (!(await existeLoteConId(db, remota.lote_id))) {
    return remota.deleted_at === null ? 'huerfana' : 'omitido';
  }
  const copia = await leerFotoUri(db, remota.id);
  if ((await guardarLaborRemota(db, remota)) === 0) {
    return (await registrarConflictoDeLabor(db, remota)) ? 'conflicto' : 'omitido';
  }
  // Si la foto cambió o la labor se borró, la copia local que había ya no corresponde (D97).
  if (copia !== null && (await leerFotoUri(db, remota.id)) === null) limpieza.push(copia);
  return 'aplicado';
};

/** Un ciclo cerrado que llega: necesita su lote aquí (aunque esté borrado), igual que una labor. */
const aplicarCiclo: Aplicar = async (db, item) => {
  const analisis = cicloRemotoSchema.safeParse(item);
  if (!analisis.success) return 'descartado';
  const remoto = analisis.data;
  if (!(await existeLoteConId(db, remoto.lote_id))) {
    return remoto.deleted_at === null ? 'huerfana' : 'omitido';
  }
  return (await guardarCicloRemoto(db, remoto)) > 0 ? 'aplicado' : 'omitido';
};

interface Totales extends ResumenRecibo {
  readonly huerfanas: number;
}

function sumar(totales: Totales, resultado: Resultado): Totales {
  return {
    aplicados: totales.aplicados + (resultado.startsWith('aplicado') ? 1 : 0),
    descartados: totales.descartados + (resultado === 'descartado' ? 1 : 0),
    avisos: totales.avisos + (['aplicado-con-aviso', 'conflicto'].includes(resultado) ? 1 : 0),
    huerfanas: totales.huerfanas + (resultado === 'huerfana' ? 1 : 0),
  };
}

type Marca = { readonly id: string; readonly updated_at: string } | null;

/** El `since` es inclusivo: el último documento de una página vuelve a venir al inicio de la siguiente. */
function sinRepetido(items: readonly unknown[], anterior: Marca): readonly unknown[] {
  if (anterior === null) return items;
  return items.filter((item) => {
    const marca = marcaSchema.safeParse(item);
    return !(
      marca.success &&
      marca.data.id === anterior.id &&
      marca.data.updated_at === anterior.updated_at
    );
  });
}

const rutaDe = (recurso: string, since: string | null): string =>
  since === null ? `/api/${recurso}` : `/api/${recurso}?since=${encodeURIComponent(since)}`;

/**
 * Trae lo cambiado desde el último cursor, página por página (una página llena puede tener más detrás),
 * y aplica cada página en una transacción EXCLUSIVA (otra conexión, D96): lo que el usuario escriba mientras
 * tanto no entra en ella ni se deshace si la página falla. El cursor nuevo es el `servidor_ahora` de la PRIMERA petición:
 * así nada cambiado mientras se descargaba se pierde (el `since` del servidor es inclusivo). Si hubo
 * elementos que aún no se pueden guardar (huérfanos), el cursor no avanza y se reintenta.
 */
async function traer(
  ctx: Contexto,
  cliente: ClienteSync,
  recurso: 'lotes' | 'labores' | 'ciclos',
  aplicar: Aplicar,
): Promise<Totales> {
  const clave = `since_${recurso}`;
  let since = await leerEstadoSync(ctx.db, clave);
  let cursor: string | null = null;
  let anterior: Marca = null;
  let totales: Totales = { aplicados: 0, descartados: 0, avisos: 0, huerfanas: 0 };
  for (;;) {
    const pagina = paginaSchema.safeParse(await cliente.pedir(rutaDe(recurso, since)));
    if (!pagina.success) throw new ErrorApi(502, 'Respuesta inesperada del servidor.');
    const { items, servidor_ahora } = pagina.data;
    cursor ??= servidor_ahora;
    const limpieza: string[] = [];
    await ctx.db.withExclusiveTransactionAsync(async (tx) => {
      for (const item of sinRepetido(items, anterior)) {
        totales = sumar(totales, await aplicar(tx, item, limpieza));
      }
    });
    for (const uri of limpieza) await ctx.fotos.borrar(uri);
    const ultimo = marcaSchema.safeParse(items.at(-1));
    // Una página que no avanza (500 con el mismo `updated_at`) se corta para no quedar en bucle.
    if (items.length < LIMITE_POR_LLAMADA || !ultimo.success || ultimo.data.updated_at === since)
      break;
    since = ultimo.data.updated_at;
    anterior = ultimo.data;
  }
  if (totales.huerfanas === 0) await guardarEstadoSync(ctx.db, clave, cursor);
  return totales;
}

/** Primero los lotes: una labor que llega necesita que su lote ya esté aquí. */
export async function recibirCambios(ctx: Contexto, cliente: ClienteSync): Promise<ResumenRecibo> {
  const lotes = await traer(ctx, cliente, 'lotes', aplicarLote);
  const ciclos = await traer(ctx, cliente, 'ciclos', aplicarCiclo);
  const labores = await traer(ctx, cliente, 'labores', aplicarLabor);
  return {
    aplicados: lotes.aplicados + ciclos.aplicados + labores.aplicados,
    descartados: lotes.descartados + ciclos.descartados + labores.descartados,
    avisos: lotes.avisos + ciclos.avisos + labores.avisos,
  };
}
