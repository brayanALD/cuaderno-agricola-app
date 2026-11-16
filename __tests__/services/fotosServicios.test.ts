import { listarFotosPorBorrar } from '@/repositories/fotoRepository';
import { insertarLabor } from '@/repositories/laborRepository';
import { actualizarLabor, borrarLabor, obtenerLabor } from '@/services/laborService';
import { borrarLote, crearLote } from '@/services/loteService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { crearFotosEnMemoria } from '../helpers/fotosEnMemoria';
import { laborFila } from '../helpers/filas';

const VIEJA = 'file:///permanente/vieja.jpg';
const URL_VIEJA = 'https://blob.test/vieja.jpg';

/** Un lote (`id-1`) con una labor `labor-1` que ya subió su foto. */
async function montar() {
  const fotos = crearFotosEnMemoria();
  fotos.sembrar(VIEJA);
  const ctx = { ...(await crearContextoDePrueba()), fotos };
  await crearLote(ctx, datosLote());
  await insertarLabor(
    ctx.db,
    laborFila({ id: 'labor-1', lote_id: 'id-1', foto_uri: VIEJA, foto_url: URL_VIEJA, pending: 0 }),
  );
  return { ctx, fotos };
}

describe('reemplazar o quitar la foto de una labor (D85)', () => {
  it('elegir otra foto: la URL del servidor se borra (queda en cola), la copia local vieja se borra y habrá que subir la nueva', async () => {
    const { ctx, fotos } = await montar();

    await actualizarLabor(ctx, 'labor-1', datosLabor({ foto_uri: 'file:///permanente/nueva.jpg' }));

    expect(await obtenerLabor(ctx, 'labor-1')).toEqual(
      expect.objectContaining({
        foto_uri: 'file:///permanente/nueva.jpg',
        foto_url: null,
        pending: 1,
      }),
    );
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([URL_VIEJA]);
    expect(fotos.archivos.has(VIEJA)).toBe(false);
  });

  it('quitar la foto hace lo mismo y deja la labor sin foto', async () => {
    const { ctx, fotos } = await montar();

    await actualizarLabor(ctx, 'labor-1', datosLabor({ foto_uri: null }));

    expect(await obtenerLabor(ctx, 'labor-1')).toEqual(
      expect.objectContaining({ foto_uri: null, foto_url: null }),
    );
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([URL_VIEJA]);
    expect(fotos.archivos.has(VIEJA)).toBe(false);
  });

  it('editar sin tocar la foto conserva su URL y no borra nada', async () => {
    const { ctx, fotos } = await montar();

    await actualizarLabor(ctx, 'labor-1', datosLabor({ cantidad: 99 }));

    expect(await obtenerLabor(ctx, 'labor-1')).toEqual(
      expect.objectContaining({ foto_uri: VIEJA, foto_url: URL_VIEJA, cantidad: 99 }),
    );
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
    expect(fotos.archivos.has(VIEJA)).toBe(true);
  });

  it('volver a mandar la misma foto tampoco la toca', async () => {
    const { ctx } = await montar();

    await actualizarLabor(ctx, 'labor-1', datosLabor({ foto_uri: VIEJA }));

    expect(await obtenerLabor(ctx, 'labor-1')).toEqual(
      expect.objectContaining({ foto_url: URL_VIEJA }),
    );
    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
  });

  it('una labor sin foto en el servidor no encola nada al cambiarle la foto', async () => {
    const { ctx } = await montar();
    await insertarLabor(
      ctx.db,
      laborFila({
        id: 'sin-url',
        lote_id: 'id-1',
        foto_uri: 'file:///permanente/x.jpg',
        foto_url: null,
      }),
    );

    await actualizarLabor(ctx, 'sin-url', datosLabor({ foto_uri: null }));

    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
  });
});

describe('borrar lo que tiene foto (D85)', () => {
  it('borrar la labor encola su imagen del servidor y borra la copia local', async () => {
    const { ctx, fotos } = await montar();

    await borrarLabor(ctx, 'labor-1');

    expect(await listarFotosPorBorrar(ctx.db)).toEqual([URL_VIEJA]);
    expect(fotos.archivos.has(VIEJA)).toBe(false);
  });

  it('borrar el lote encola las imágenes de todas sus labores y borra las copias locales', async () => {
    const { ctx, fotos } = await montar();
    fotos.sembrar('file:///permanente/otra.jpg');
    await insertarLabor(
      ctx.db,
      laborFila({
        id: 'labor-2',
        lote_id: 'id-1',
        foto_uri: 'file:///permanente/otra.jpg',
        foto_url: 'https://blob.test/otra.jpg',
      }),
    );

    await borrarLote(ctx, 'id-1');

    expect(await listarFotosPorBorrar(ctx.db)).toEqual(['https://blob.test/otra.jpg', URL_VIEJA]);
    expect(fotos.archivos.size).toBe(0);
  });

  it('borrar una labor sin foto no encola nada', async () => {
    const { ctx } = await montar();
    await insertarLabor(ctx.db, laborFila({ id: 'sin', lote_id: 'id-1', foto_uri: null }));

    await borrarLabor(ctx, 'sin');

    expect(await listarFotosPorBorrar(ctx.db)).toEqual([]);
  });
});
