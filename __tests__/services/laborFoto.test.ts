import { actualizarLabor, crearLabor, obtenerLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

async function contextoConLote() {
  const ctx = await crearContextoDePrueba();
  await crearLote(ctx, datosLote());
  return ctx; // el lote es id-1; la siguiente id nueva es id-2
}

describe('foto de la labor (foto_uri, D34: galería)', () => {
  it('crearLabor guarda la foto elegida y sin foto queda null', async () => {
    const ctx = await contextoConLote();

    await crearLabor(ctx, 'id-1', datosLabor({ foto_uri: 'file:///galeria/riego.jpg' }));
    await crearLabor(ctx, 'id-1', datosLabor());

    expect(await obtenerLabor(ctx, 'id-2')).toMatchObject({
      foto_uri: 'file:///galeria/riego.jpg',
    });
    expect(await obtenerLabor(ctx, 'id-3')).toMatchObject({ foto_uri: null });
  });

  it('actualizarLabor conserva la foto si no se envía y la quita si se envía null', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor({ foto_uri: 'file:///galeria/riego.jpg' }));

    await actualizarLabor(ctx, 'id-2', datosLabor({ cantidad: 30 }));
    expect(await obtenerLabor(ctx, 'id-2')).toMatchObject({
      cantidad: 30,
      foto_uri: 'file:///galeria/riego.jpg',
    });

    await actualizarLabor(ctx, 'id-2', datosLabor({ foto_uri: null }));
    expect(await obtenerLabor(ctx, 'id-2')).toMatchObject({ foto_uri: null });
  });

  it('actualizarLabor cambia la foto por otra', async () => {
    const ctx = await contextoConLote();
    await crearLabor(ctx, 'id-1', datosLabor({ foto_uri: 'file:///a.jpg' }));

    await actualizarLabor(ctx, 'id-2', datosLabor({ foto_uri: 'file:///b.jpg' }));

    expect(await obtenerLabor(ctx, 'id-2')).toMatchObject({ foto_uri: 'file:///b.jpg' });
  });
});
