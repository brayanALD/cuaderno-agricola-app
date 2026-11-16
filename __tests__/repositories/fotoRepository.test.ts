import {
  encolarBorradoDeFoto,
  encolarFotosDeLote,
  listarFotosPorBorrar,
  quitarFotoPorBorrar,
} from '@/repositories/fotoRepository';
import {
  guardarFotoUrl,
  insertarLabor,
  listarLaboresConFotoPorSubir,
} from '@/repositories/laborRepository';
import { insertarLote } from '@/repositories/loteRepository';
import { crearDbMigrada } from '../helpers/baseEnMemoria';
import { laborFila, loteFila } from '../helpers/filas';

const T1 = '2026-11-14T15:00:00.000Z';
const T2 = '2026-11-14T16:00:00.000Z';

describe('cola de imágenes por borrar (D85)', () => {
  it('encolar dos veces la misma URL la deja una sola vez', async () => {
    const db = await crearDbMigrada();

    await encolarBorradoDeFoto(db, 'https://blob.test/a.jpg');
    await encolarBorradoDeFoto(db, 'https://blob.test/a.jpg');

    expect(await listarFotosPorBorrar(db)).toEqual(['https://blob.test/a.jpg']);
  });

  it('quitar saca la URL de la cola', async () => {
    const db = await crearDbMigrada();
    await encolarBorradoDeFoto(db, 'https://blob.test/a.jpg');
    await encolarBorradoDeFoto(db, 'https://blob.test/b.jpg');

    await quitarFotoPorBorrar(db, 'https://blob.test/a.jpg');

    expect(await listarFotosPorBorrar(db)).toEqual(['https://blob.test/b.jpg']);
  });

  it('encolarFotosDeLote toma las fotos de las labores VIVAS de ese lote y no las de otros', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'l1', nombre: 'A' }));
    await insertarLote(db, loteFila({ id: 'l2', nombre: 'B' }));
    await insertarLabor(
      db,
      laborFila({ id: 'x1', lote_id: 'l1', foto_url: 'https://blob.test/1.jpg' }),
    );
    await insertarLabor(db, laborFila({ id: 'x2', lote_id: 'l1', foto_url: null }));
    await insertarLabor(
      db,
      laborFila({
        id: 'x3',
        lote_id: 'l1',
        foto_url: 'https://blob.test/borrada.jpg',
        deleted_at: T1,
      }),
    );
    await insertarLabor(
      db,
      laborFila({ id: 'x4', lote_id: 'l2', foto_url: 'https://blob.test/otro.jpg' }),
    );

    await encolarFotosDeLote(db, 'l1');

    expect(await listarFotosPorBorrar(db)).toEqual(['https://blob.test/1.jpg']);
  });
});

describe('labores con foto por subir', () => {
  it('solo las vivas, pendientes, con foto local y sin URL, y de lotes sin aviso', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ id: 'ok', nombre: 'Ok', pending: 0 }));
    await insertarLote(db, loteFila({ id: 'malo', nombre: 'Malo', sync_error: 'Choque' }));
    const f = 'file:///permanente/f.jpg';
    await insertarLabor(db, laborFila({ id: 'sube', lote_id: 'ok', foto_uri: f }));
    await insertarLabor(
      db,
      laborFila({ id: 'ya', lote_id: 'ok', foto_uri: f, foto_url: 'https://blob.test/ya.jpg' }),
    );
    await insertarLabor(db, laborFila({ id: 'sin', lote_id: 'ok', foto_uri: null }));
    await insertarLabor(
      db,
      laborFila({ id: 'borrada', lote_id: 'ok', foto_uri: f, deleted_at: T1 }),
    );
    await insertarLabor(
      db,
      laborFila({ id: 'sincronizada', lote_id: 'ok', foto_uri: f, pending: 0 }),
    );
    await insertarLabor(db, laborFila({ id: 'espera', lote_id: 'malo', foto_uri: f }));

    expect((await listarLaboresConFotoPorSubir(db)).map((l) => l.id)).toEqual(['sube']);
  });

  it('guardarFotoUrl solo actúa si la labor no cambió mientras se subía', async () => {
    const db = await crearDbMigrada();
    await insertarLote(db, loteFila({ pending: 0 }));
    await insertarLabor(db, laborFila({ updated_at: T1, foto_uri: 'file:///permanente/f.jpg' }));

    expect(await guardarFotoUrl(db, 'labor-1', T2, 'https://blob.test/x.jpg')).toBe(0);
    expect(await guardarFotoUrl(db, 'labor-1', T1, 'https://blob.test/x.jpg')).toBe(1);

    expect(await db.getFirstAsync('SELECT foto_url FROM labor')).toEqual({
      foto_url: 'https://blob.test/x.jpg',
    });
  });
});
