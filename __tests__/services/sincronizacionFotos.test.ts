import { listarFotosPorBorrar } from '@/repositories/fotoRepository';
import { actualizarLabor, borrarLabor, crearLabor, obtenerLabor } from '@/services/laborService';
import { borrarLote, crearLote } from '@/services/loteService';
import { sincronizar } from '@/services/sincronizacionService';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearFotosEnMemoria } from '../helpers/fotosEnMemoria';
import { crearServidorFalso } from '../helpers/servidorFalso';

const FOTO = 'file:///permanente/a.jpg';
const BYTES = new Uint8Array([255, 216, 255, 1, 2, 3]);

async function montar() {
  const { ctx: base, avanzar } = await crearDispositivo();
  const fotos = crearFotosEnMemoria();
  const ctx = { ...base, fotos };
  const servidor = crearServidorFalso();
  return { ctx, avanzar, fotos, servidor };
}

/** Un lote (`a-1`) con una labor (`a-2`) que tiene una foto local por subir. */
async function conFoto() {
  const m = await montar();
  m.fotos.sembrar(FOTO, BYTES);
  await crearLote(m.ctx, datosLote());
  await crearLabor(m.ctx, 'a-1', datosLabor({ foto_uri: FOTO }));
  return m;
}

const rutas = (servidor: ReturnType<typeof crearServidorFalso>) =>
  servidor.llamadas.map((l) => `${l.metodo} ${l.ruta.split('?')[0] ?? ''}`);

describe('sincronizar: subir las fotos (D83, D84)', () => {
  it('sube la foto ANTES de enviar su labor y la labor lleva la URL', async () => {
    const { ctx, servidor } = await conFoto();

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok).toBe(true);
    expect([...servidor.imagenes.values()]).toEqual([BYTES]);
    const [url] = [...servidor.imagenes.keys()];
    expect(servidor.labores.get('a-2')).toEqual(expect.objectContaining({ foto_url: url }));
    expect(rutas(servidor).indexOf('POST /api/imagenes')).toBeLessThan(
      rutas(servidor).indexOf('PUT /api/labores/a-2'),
    );
    expect(await obtenerLabor(ctx, 'a-2')).toEqual(
      expect.objectContaining({ foto_uri: FOTO, foto_url: url, pending: 0 }),
    );
  });

  it('envía la foto con su tipo (image/jpeg) y no la sube dos veces', async () => {
    const { ctx, servidor } = await conFoto();

    await sincronizar(ctx, servidor);
    servidor.llamadas.length = 0;
    await sincronizar(ctx, servidor);

    expect(servidor.llamadasA('POST')).toEqual([]);
    expect(servidor.imagenes.size).toBe(1);
  });

  it('sin conexión al subir no se pierde nada; al volver la red se sube UNA vez', async () => {
    const { ctx, servidor } = await conFoto();
    servidor.estado.sinRed = true;

    const sin = await sincronizar(ctx, servidor);
    servidor.estado.sinRed = false;
    const con = await sincronizar(ctx, servidor);

    expect(sin.ok).toBe(false);
    expect(con.ok).toBe(true);
    expect(servidor.imagenes.size).toBe(1);
    expect(servidor.labores.get('a-2')?.foto_url).not.toBeNull();
  });

  it('si el archivo de la foto ya no existe, la labor queda con aviso y lo demás sigue', async () => {
    const { ctx, servidor, fotos } = await conFoto();
    fotos.archivos.delete(FOTO);

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.conAviso).toBe(1);
    expect(servidor.labores.has('a-2')).toBe(false);
    expect(servidor.lotes.has('a-1')).toBe(true);
    expect((await obtenerLabor(ctx, 'a-2'))?.sync_error).toBe(
      'La foto ya no está en este teléfono. Quítala o elige otra para sincronizar esta labor.',
    );
  });

  it('quitar la foto con aviso arregla la labor: se envía sin foto', async () => {
    const { ctx, servidor, fotos, avanzar } = await conFoto();
    fotos.archivos.delete(FOTO);
    await sincronizar(ctx, servidor);
    avanzar();

    await actualizarLabor(ctx, 'a-2', datosLabor({ foto_uri: null }));
    await sincronizar(ctx, servidor);

    expect(servidor.labores.get('a-2')).toEqual(expect.objectContaining({ foto_url: null }));
  });

  it('una foto de más de 4 MB (413) deja la labor con aviso y no sube nada', async () => {
    const { ctx, servidor, fotos } = await conFoto();
    fotos.sembrar(FOTO, new Uint8Array(4_000_001));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.conAviso).toBe(1);
    expect(servidor.imagenes.size).toBe(0);
    expect((await obtenerLabor(ctx, 'a-2'))?.sync_error).toBe(
      'La foto pesa demasiado para subirla (máximo ~4 MB). Elige otra.',
    );
    expect(servidor.labores.has('a-2')).toBe(false);
  });

  it('si la labor se edita mientras sube la foto, esa subida se descarta (se borra en la misma vuelta) y se vuelve a subir', async () => {
    const { ctx, servidor, avanzar } = await conFoto();
    servidor.estado.alResponder = async (metodo, ruta) => {
      if (metodo !== 'POST' || ruta !== '/api/imagenes') return;
      avanzar();
      await actualizarLabor(ctx, 'a-2', datosLabor({ foto_uri: FOTO, cantidad: 55 }));
      servidor.estado.alResponder = null;
    };

    await sincronizar(ctx, servidor);

    expect(servidor.imagenes.size).toBe(0);
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
    expect(servidor.labores.has('a-2')).toBe(false);

    avanzar();
    await sincronizar(ctx, servidor);

    expect(servidor.imagenes.size).toBe(1);
    expect(servidor.labores.get('a-2')).toEqual(expect.objectContaining({ cantidad: 55 }));
  });
});

describe('sincronizar: borrar imágenes del servidor (D85)', () => {
  it('reemplazar la foto: sube la nueva, envía su URL y borra la vieja', async () => {
    const { ctx, servidor, fotos, avanzar } = await conFoto();
    await sincronizar(ctx, servidor);
    const [vieja] = [...servidor.imagenes.keys()];
    avanzar();
    fotos.sembrar('file:///permanente/b.jpg', new Uint8Array([7, 7]));

    await actualizarLabor(ctx, 'a-2', datosLabor({ foto_uri: 'file:///permanente/b.jpg' }));
    await sincronizar(ctx, servidor);

    expect([...servidor.imagenes.values()]).toEqual([new Uint8Array([7, 7])]);
    expect(servidor.imagenes.has(vieja ?? '')).toBe(false);
    expect(servidor.labores.get('a-2')?.foto_url).toBe([...servidor.imagenes.keys()][0]);
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
  });

  it('quitar la foto: la labor se envía con foto_url null y la imagen se borra', async () => {
    const { ctx, servidor, avanzar } = await conFoto();
    await sincronizar(ctx, servidor);
    avanzar();

    await actualizarLabor(ctx, 'a-2', datosLabor({ foto_uri: null }));
    await sincronizar(ctx, servidor);

    expect(servidor.imagenes.size).toBe(0);
    expect(servidor.labores.get('a-2')).toEqual(expect.objectContaining({ foto_url: null }));
  });

  it('borrar la labor borra su imagen; borrar el lote borra las de todas sus labores', async () => {
    const { ctx, servidor, fotos, avanzar } = await conFoto();
    fotos.sembrar('file:///permanente/c.jpg', new Uint8Array([4]));
    await crearLabor(ctx, 'a-1', datosLabor({ foto_uri: 'file:///permanente/c.jpg' }));
    await sincronizar(ctx, servidor);
    expect(servidor.imagenes.size).toBe(2);
    avanzar();

    await borrarLabor(ctx, 'a-2');
    await sincronizar(ctx, servidor);
    expect(servidor.imagenes.size).toBe(1);
    avanzar();

    await borrarLote(ctx, 'a-1');
    await sincronizar(ctx, servidor);
    expect(servidor.imagenes.size).toBe(0);
  });

  it('si no hay red la imagen sigue en la cola y se borra cuando vuelve', async () => {
    const { ctx, servidor, avanzar } = await conFoto();
    await sincronizar(ctx, servidor);
    avanzar();
    await actualizarLabor(ctx, 'a-2', datosLabor({ foto_uri: null }));
    servidor.estado.sinRed = true;

    await sincronizar(ctx, servidor);
    expect(await listarFotosPorBorrar(ctx.db)).toHaveLength(1);
    expect(servidor.imagenes.size).toBe(1);

    servidor.estado.sinRed = false;
    await sincronizar(ctx, servidor);

    expect(servidor.imagenes.size).toBe(0);
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
  });

  it('una imagen que el servidor ya no tiene (404) sale de la cola sin más', async () => {
    const { ctx, servidor, avanzar } = await conFoto();
    await sincronizar(ctx, servidor);
    avanzar();
    await actualizarLabor(ctx, 'a-2', datosLabor({ foto_uri: null }));
    servidor.imagenes.clear();

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok).toBe(true);
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
  });
});
