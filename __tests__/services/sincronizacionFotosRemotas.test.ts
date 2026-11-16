import { crearLabor, actualizarLabor, borrarLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { sincronizar } from '@/services/sincronizacionService';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearFotosEnMemoria } from '../helpers/fotosEnMemoria';
import { crearServidorFalso } from '../helpers/servidorFalso';

const FOTO = 'file:///cache/a.jpg';
const OTRA = 'file:///cache/otra.jpg';
const COPIA = 'file:///remotas/remota-a-2.jpg';

/** Un teléfono con sus fotos en memoria. */
async function telefono(nombre: string) {
  const d = await crearDispositivo(nombre);
  const fotos = crearFotosEnMemoria();
  return { ...d, ctx: { ...d.ctx, fotos }, fotos };
}

/** A tomó una foto en su labor `a-2` y sincronizó; B todavía no ha sincronizado. */
async function conFotoDeA() {
  const servidor = crearServidorFalso();
  const a = await telefono('a');
  const b = await telefono('b');
  a.fotos.sembrar(FOTO);
  await crearLote(a.ctx, datosLote());
  await crearLabor(a.ctx, 'a-1', datosLabor({ foto_uri: FOTO }));
  await sincronizar(a.ctx, servidor);
  return { servidor, a, b };
}

const fotoDe = (t: { ctx: { db: { getFirstAsync: <T>(sql: string) => Promise<T | null> } } }) =>
  t.ctx.db.getFirstAsync<{
    foto_uri: string | null;
    foto_url: string | null;
    pending: number;
    updated_at: string;
  }>('SELECT foto_uri, foto_url, pending, updated_at FROM labor');

describe('copia local de las fotos de otros teléfonos (D97)', () => {
  it('la foto de otro teléfono se baja a una copia local y la labor la usa', async () => {
    const { servidor, a, b } = await conFotoDeA();

    await sincronizar(b.ctx, servidor);

    const [url] = [...servidor.imagenes.keys()];
    expect(b.fotos.descargadas).toEqual([url]);
    expect(await fotoDe(b)).toMatchObject({ foto_uri: COPIA, foto_url: url, pending: 0 });
    expect(b.fotos.archivos.has(COPIA)).toBe(true);
    expect(a.fotos.descargadas).toEqual([]);
  });

  it('la copia NO cuenta como cambio: no toca updated_at ni deja nada pendiente', async () => {
    const { servidor, b } = await conFotoDeA();
    await b.ctx.db.execAsync('DELETE FROM sync_estado');
    await sincronizar(b.ctx, servidor);
    const antes = await fotoDe(b);

    await sincronizar(b.ctx, servidor);

    expect(await fotoDe(b)).toEqual(antes);
    expect(servidor.llamadasA('POST').filter((l) => l.ruta === '/api/imagenes')).toHaveLength(1);
  });

  it('no se vuelve a bajar en las vueltas siguientes', async () => {
    const { servidor, b } = await conFotoDeA();

    await sincronizar(b.ctx, servidor);
    await sincronizar(b.ctx, servidor);
    await sincronizar(b.ctx, servidor);

    expect(b.fotos.descargadas).toHaveLength(1);
  });

  it('la foto propia no se baja de nuevo cuando vuelve como eco del servidor', async () => {
    const { servidor, a } = await conFotoDeA();

    await sincronizar(a.ctx, servidor);

    expect(a.fotos.descargadas).toEqual([]);
    expect(await fotoDe(a)).toMatchObject({ foto_uri: FOTO });
  });

  it('si la descarga falla, la sincronización sigue bien y se reintenta en la próxima vuelta', async () => {
    const { servidor, b } = await conFotoDeA();
    b.fotos.estado.fallarDescargas = true;

    const resultado = await sincronizar(b.ctx, servidor);
    expect(resultado.ok).toBe(true);
    expect(await fotoDe(b)).toMatchObject({ foto_uri: null });

    b.fotos.estado.fallarDescargas = false;
    await sincronizar(b.ctx, servidor);
    expect(await fotoDe(b)).toMatchObject({ foto_uri: COPIA });
  });

  it('si el otro teléfono cambia la foto, la copia vieja se borra y se baja la nueva', async () => {
    const { servidor, a, b } = await conFotoDeA();
    await sincronizar(b.ctx, servidor);
    a.fotos.sembrar(OTRA);
    a.avanzar();
    await actualizarLabor(a.ctx, 'a-2', datosLabor({ foto_uri: OTRA }));
    await sincronizar(a.ctx, servidor);

    await sincronizar(b.ctx, servidor);

    expect(b.fotos.descargadas).toHaveLength(2);
    expect(await fotoDe(b)).toMatchObject({ foto_uri: COPIA });
    expect([...b.fotos.archivos.keys()]).toEqual([COPIA]);
  });

  it('si el otro teléfono borra la labor, su copia local también se borra', async () => {
    const { servidor, a, b } = await conFotoDeA();
    await sincronizar(b.ctx, servidor);
    a.avanzar();
    await borrarLabor(a.ctx, 'a-2');
    await sincronizar(a.ctx, servidor);

    await sincronizar(b.ctx, servidor);

    expect(b.fotos.archivos.has(COPIA)).toBe(false);
  });

  it('editar otra cosa de la labor no vuelve a subir la foto ni pierde su URL', async () => {
    const { servidor, b } = await conFotoDeA();
    await sincronizar(b.ctx, servidor);
    const [url] = [...servidor.imagenes.keys()];

    b.avanzar();
    await actualizarLabor(b.ctx, 'a-2', datosLabor({ foto_uri: COPIA, nota: 'Ya vi la foto' }));
    await sincronizar(b.ctx, servidor);

    expect(await fotoDe(b)).toMatchObject({ foto_uri: COPIA, foto_url: url, pending: 0 });
    expect(servidor.llamadasA('POST').filter((l) => l.ruta === '/api/imagenes')).toHaveLength(1);
  });

  it('solo se bajan URLs https: lo que mande el servidor es dato, no orden', async () => {
    const servidor = crearServidorFalso();
    const b = await telefono('b');
    servidor.sembrar('lotes', {
      id: 'l1',
      nombre: 'Lote',
      cultivo: 'Café',
      area_m2: 10,
      altitud_m: null,
      lat: null,
      lng: null,
      fecha_siembra: '2026-08-01',
      finca: null,
    });
    for (const [id, url] of [
      ['x1', 'http://sitio.test/a.jpg'],
      ['x2', 'file:///data/user/0/app/privado.db'],
    ] as const)
      servidor.sembrar('labores', laborRemota(id, url));

    await sincronizar(b.ctx, servidor);

    expect(b.fotos.descargadas).toEqual([]);
  });

  it('baja como máximo 20 fotos por vuelta y sigue en la siguiente', async () => {
    const servidor = crearServidorFalso();
    const b = await telefono('b');
    servidor.sembrar('lotes', {
      id: 'l1',
      nombre: 'Lote',
      cultivo: 'Café',
      area_m2: 10,
      altitud_m: null,
      lat: null,
      lng: null,
      fecha_siembra: '2026-08-01',
      finca: null,
    });
    for (let i = 0; i < 25; i += 1) {
      servidor.sembrar(
        'labores',
        laborRemota(`x${String(i)}`, `https://blob.test/${String(i)}.jpg`),
      );
    }

    await sincronizar(b.ctx, servidor);
    expect(b.fotos.descargadas).toHaveLength(20);

    await sincronizar(b.ctx, servidor);
    expect(b.fotos.descargadas).toHaveLength(25);
  });
});

function laborRemota(id: string, foto_url: string) {
  return {
    id,
    lote_id: 'l1',
    tipo: 'riego',
    fecha: '2026-11-01',
    cantidad: 5,
    unidad: 'L',
    nota: null,
    foto_url,
    luz: null,
    producto: null,
    carencia_dias: null,
    costo: null,
  };
}
