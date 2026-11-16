import { ErrorApi, ErrorDeRed } from '@/api/errores';
import type { CuerpoBinario } from '@/api/cliente';
import type { ClienteSync } from '@/services/sincronizacionService';

export type Recurso = 'lotes' | 'labores' | 'ciclos';
export type DocRemoto = Record<string, unknown> & {
  id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** Los campos que la API acepta en cada `PUT` (sección 9.3–9.4): ni uno más ni uno menos. */
const CAMPOS: Record<Recurso, readonly string[]> = {
  lotes: ['nombre', 'cultivo', 'area_m2', 'altitud_m', 'lat', 'lng', 'fecha_siembra', 'finca'],
  labores: [
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
  ],
  ciclos: ['lote_id', 'cultivo', 'fecha_inicio', 'fecha_fin', 'total_kg'],
};

const esRecurso = (texto: string | undefined): texto is Recurso =>
  texto === 'lotes' || texto === 'labores' || texto === 'ciclos';

/** Campos añadidos después (D95): la API los acepta ausentes y los guarda como `null` (clientes antiguos). */
const OPCIONALES: Record<Recurso, readonly string[]> = {
  lotes: ['finca'],
  labores: ['producto', 'carencia_dias', 'costo'],
  ciclos: [],
};

/** Misma regla que la API (D61): sin distinguir mayúsculas ASCII ni espacios en los extremos. */
const claveDeNombre = (nombre: unknown): string =>
  String(nombre)
    .trim()
    .replace(/[A-Z]/g, (letra) => letra.toLowerCase());

export interface LlamadaRegistrada {
  readonly metodo: string;
  readonly ruta: string;
  readonly cuerpo: unknown;
}

/** Máximo por llamada del `GET` (sección 9.3). */
export const TAMANO_PAGINA = 500;

/**
 * La API (repo hermano) en memoria: mismas respuestas y errores, con un reloj que avanza 1 s por
 * petición. Sirve para probar la sincronización de punta a punta, incluso con dos teléfonos.
 */
export function crearServidorFalso() {
  let reloj = Date.parse('2026-11-15T10:00:00.000Z');
  const ahora = () => new Date((reloj += 1000)).toISOString();
  const colecciones: Record<Recurso, Map<string, DocRemoto>> = {
    lotes: new Map(),
    labores: new Map(),
    ciclos: new Map(),
  };
  const llamadas: LlamadaRegistrada[] = [];
  const imagenes = new Map<string, Uint8Array>();
  let contadorImagenes = 0;

  const estado = {
    sinRed: false,
    /** Si se pone, TODAS las peticiones responden con este error HTTP. */
    fallarCon: null as number | null,
    /** Se ejecuta con la respuesta ya calculada y antes de entregarla: simula algo que pasa «mientras tanto». */
    alResponder: null as ((metodo: string, ruta: string) => Promise<void> | void) | null,
  };

  const invalido = (campo: string, mensaje: string) =>
    new ErrorApi(400, 'Datos inválidos', [{ campo, mensaje }]);

  /** Solo los campos declarados; los opcionales que falten valen `null`. */
  function normalizar(recurso: Recurso, cuerpo: unknown): Record<string, unknown> {
    const datos: Record<string, unknown> = { ...((cuerpo ?? {}) as Record<string, unknown>) };
    for (const campo of OPCIONALES[recurso]) datos[campo] ??= null;
    const claves = Object.keys(datos).sort().join(',');
    if (claves !== [...CAMPOS[recurso]].sort().join(',')) {
      throw invalido('cuerpo', `Campos inesperados o faltantes: ${claves}`);
    }
    return datos;
  }

  function exigirNombreLibre(id: string, nombre: unknown): void {
    const repetido = [...colecciones.lotes.values()].some(
      (otro) =>
        otro.id !== id &&
        otro.deleted_at === null &&
        claveDeNombre(otro.nombre) === claveDeNombre(nombre),
    );
    if (repetido) throw new ErrorApi(409, 'Ya existe un lote con ese nombre.');
  }

  /** Una labor exige un lote vivo; un ciclo cerrado es historial y basta con que el lote exista. */
  function exigirLote(recurso: Recurso, loteId: unknown): void {
    const lote = colecciones.lotes.get(String(loteId));
    const sirve = lote !== undefined && (recurso === 'ciclos' || lote.deleted_at === null);
    if (!sirve) throw invalido('lote_id', 'El lote no existe.');
  }

  function guardar(recurso: Recurso, id: string, cuerpo: unknown): DocRemoto {
    const datos = normalizar(recurso, cuerpo);
    if (recurso === 'lotes') exigirNombreLibre(id, datos.nombre);
    else exigirLote(recurso, datos.lote_id);
    const previo = colecciones[recurso].get(id);
    const marca = ahora();
    const doc: DocRemoto = {
      ...datos,
      id,
      created_at: previo?.created_at ?? marca,
      updated_at: marca,
      deleted_at: null,
    };
    colecciones[recurso].set(id, doc);
    return doc;
  }

  function borrar(recurso: Recurso, id: string): { ok: true } {
    const previo = colecciones[recurso].get(id);
    if (previo === undefined) throw new ErrorApi(404, 'No encontrado');
    const marca = ahora();
    colecciones[recurso].set(id, { ...previo, deleted_at: marca, updated_at: marca });
    return { ok: true };
  }

  function listar(recurso: Recurso, since: string | null) {
    const servidor_ahora = ahora();
    const items = [...colecciones[recurso].values()]
      .filter((doc) => since === null || doc.updated_at >= since)
      .sort((a, b) =>
        a.updated_at === b.updated_at
          ? a.id.localeCompare(b.id)
          : a.updated_at.localeCompare(b.updated_at),
      )
      .slice(0, TAMANO_PAGINA);
    return { items, servidor_ahora };
  }

  /** `POST /api/imagenes` (9.5): bytes + Content-Type; 415 si no es imagen, 413 si pasa de ~4 MB. */
  function subirImagen(binario: CuerpoBinario | undefined) {
    if (binario === undefined) throw new ErrorApi(400, 'La imagen está vacía');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(binario.tipo)) {
      throw new ErrorApi(415, 'Solo se admiten imágenes JPEG, PNG o WebP');
    }
    if (binario.bytes.byteLength > 4_000_000) throw new ErrorApi(413, 'La imagen pesa más de 4 MB');
    const url = `https://blob.test/usuarios/u1/${String(++contadorImagenes)}.jpg`;
    imagenes.set(url, binario.bytes);
    return { url, pathname: url.replace('https://blob.test/', '') };
  }

  /** `DELETE /api/imagenes?url=`: 404 si no existe (no es de este usuario o ya se borró). */
  function borrarImagen(consulta: string) {
    const url = new URLSearchParams(consulta).get('url') ?? '';
    if (!imagenes.delete(url)) throw new ErrorApi(404, 'No encontrado');
    return { ok: true };
  }

  function responder(
    metodo: string,
    ruta: string,
    cuerpo: unknown,
    binario: CuerpoBinario | undefined,
  ): unknown {
    const [camino = '', consulta = ''] = ruta.split('?');
    const [, , recurso, id] = camino.split('/');
    if (recurso === 'imagenes') {
      return metodo === 'POST' ? subirImagen(binario) : borrarImagen(consulta);
    }
    if (!esRecurso(recurso)) throw new ErrorApi(404, 'No encontrado');
    if (metodo === 'GET') return listar(recurso, new URLSearchParams(consulta).get('since'));
    if (id === undefined) throw new ErrorApi(404, 'No encontrado');
    return metodo === 'PUT' ? guardar(recurso, id, cuerpo) : borrar(recurso, id);
  }

  const pedir: ClienteSync['pedir'] = async (ruta, peticion = {}) => {
    const metodo = peticion.metodo ?? 'GET';
    llamadas.push({ metodo, ruta, cuerpo: peticion.cuerpo ?? peticion.binario?.bytes });
    if (estado.sinRed) throw new ErrorDeRed('No hay conexión con el servidor.');
    if (estado.fallarCon !== null) throw new ErrorApi(estado.fallarCon, 'Fallo simulado');
    const respuesta = responder(metodo, ruta, peticion.cuerpo, peticion.binario);
    await estado.alResponder?.(metodo, ruta);
    return respuesta;
  };

  return {
    pedir,
    llamadas,
    estado,
    lotes: colecciones.lotes,
    labores: colecciones.labores,
    ciclos: colecciones.ciclos,
    /** Imágenes subidas: URL → bytes. */
    imagenes,
    /** Mete un documento tal cual, saltándose las reglas (datos «de otro dispositivo» o corruptos). */
    sembrar(recurso: Recurso, doc: Partial<DocRemoto> & { id: string }) {
      const marca = ahora();
      colecciones[recurso].set(doc.id, {
        created_at: marca,
        updated_at: marca,
        deleted_at: null,
        ...doc,
      });
    },
    /** Lo que otro dispositivo haría con `PUT`/`DELETE`: pasa por las mismas reglas que la API. */
    guardar,
    borrar,
    llamadasA: (metodo: string) => llamadas.filter((l) => l.metodo === metodo),
  };
}

export type ServidorFalso = ReturnType<typeof crearServidorFalso>;
