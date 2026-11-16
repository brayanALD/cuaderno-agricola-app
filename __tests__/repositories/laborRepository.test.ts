import {
  actualizarLabor,
  buscarLabores,
  insertarLabor,
  listarCosechasDeLote,
  listarLaboresDeLote,
  listarLaboresRecientes,
  marcarLaborBorrada,
  marcarLaboresDeLoteBorradas,
  obtenerLabor,
} from '@/repositories/laborRepository';
import { insertarLote, marcarLoteBorrado } from '@/repositories/loteRepository';
import { crearDbMigrada } from '../helpers/baseEnMemoria';
import { AHORA, laborFila, loteFila } from '../helpers/filas';

const DESPUES = '2026-11-15T09:30:00.000Z';

async function baseConLotes() {
  const db = await crearDbMigrada();
  await insertarLote(db, loteFila({ id: 'lote-1', nombre: 'Uno' }));
  await insertarLote(db, loteFila({ id: 'lote-2', nombre: 'Dos' }));
  return db;
}

describe('laborRepository', () => {
  it('guarda y recupera una labor con foto y luz', async () => {
    const db = await baseConLotes();
    const labor = laborFila({
      nota: 'Riego por goteo',
      foto_uri: 'file:///foto.jpg',
      foto_url: 'https://blob.example/foto.jpg',
      luz: 'soleado',
    });

    await insertarLabor(db, labor);

    expect(await obtenerLabor(db, 'labor-1')).toEqual(labor);
  });

  it('obtenerLabor devuelve null si no existe o está borrada', async () => {
    const db = await baseConLotes();
    await insertarLabor(db, laborFila());
    await marcarLaborBorrada(db, 'labor-1', DESPUES);

    expect(await obtenerLabor(db, 'labor-1')).toBeNull();
    expect(await obtenerLabor(db, 'otra')).toBeNull();
  });

  it('actualiza los campos editables y deja pendiente', async () => {
    const db = await baseConLotes();
    await insertarLabor(db, laborFila({ pending: 0 }));

    const cambios = await actualizarLabor(
      db,
      laborFila({ cantidad: 35, nota: 'Más agua', luz: 'nublado', updated_at: DESPUES }),
    );

    expect(cambios).toBe(1);
    expect(await obtenerLabor(db, 'labor-1')).toMatchObject({
      cantidad: 35,
      nota: 'Más agua',
      luz: 'nublado',
      created_at: AHORA,
      updated_at: DESPUES,
      pending: 1,
    });
    expect(await actualizarLabor(db, laborFila({ id: 'nada' }))).toBe(0);
  });

  it('lista las labores de un lote, de la más reciente a la más antigua, sin borradas', async () => {
    const db = await baseConLotes();
    await insertarLabor(db, laborFila({ id: 'a', fecha: '2026-11-01' }));
    await insertarLabor(db, laborFila({ id: 'b', fecha: '2026-11-10' }));
    await insertarLabor(db, laborFila({ id: 'c', fecha: '2026-11-05' }));
    await insertarLabor(db, laborFila({ id: 'd', fecha: '2026-11-12' }));
    await insertarLabor(db, laborFila({ id: 'otro', lote_id: 'lote-2', fecha: '2026-11-11' }));
    await marcarLaborBorrada(db, 'd', DESPUES);

    const ids = (await listarLaboresDeLote(db, 'lote-1')).map((labor) => labor.id);

    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('las recientes salen de todos los lotes vivos, con límite', async () => {
    const db = await baseConLotes();
    await insertarLabor(db, laborFila({ id: 'a', fecha: '2026-11-01' }));
    await insertarLabor(db, laborFila({ id: 'b', lote_id: 'lote-2', fecha: '2026-11-10' }));
    await insertarLabor(db, laborFila({ id: 'c', fecha: '2026-11-05' }));

    expect((await listarLaboresRecientes(db, 2)).map((l) => l.id)).toEqual(['b', 'c']);
  });

  it('las labores de un lote borrado no aparecen en recientes ni en la búsqueda', async () => {
    const db = await baseConLotes();
    await insertarLabor(db, laborFila({ id: 'a', nota: 'zanja' }));
    await insertarLabor(db, laborFila({ id: 'b', lote_id: 'lote-2', nota: 'zanja' }));
    await marcarLoteBorrado(db, 'lote-1', DESPUES);

    expect((await listarLaboresRecientes(db, 10)).map((l) => l.id)).toEqual(['b']);
    expect((await buscarLabores(db, 'zanja')).map((l) => l.id)).toEqual(['b']);
  });

  it('busca por tipo o nota sin distinguir mayúsculas, y trata % como texto', async () => {
    const db = await baseConLotes();
    await insertarLabor(db, laborFila({ id: 'a', tipo: 'abono', nota: 'Urea al 46%' }));
    await insertarLabor(db, laborFila({ id: 'b', tipo: 'poda', nota: 'Ramas bajas' }));

    expect((await buscarLabores(db, 'ABONO')).map((l) => l.id)).toEqual(['a']);
    expect((await buscarLabores(db, 'ramas')).map((l) => l.id)).toEqual(['b']);
    expect((await buscarLabores(db, '%')).map((l) => l.id)).toEqual(['a']);
    expect(await buscarLabores(db, 'xyz')).toEqual([]);
  });

  it('marcarLaborBorrada y marcarLaboresDeLoteBorradas dejan la marca de sincronización', async () => {
    const db = await baseConLotes();
    await insertarLabor(db, laborFila({ id: 'a', pending: 0 }));
    await insertarLabor(db, laborFila({ id: 'b', pending: 0 }));
    await insertarLabor(db, laborFila({ id: 'c', lote_id: 'lote-2', pending: 0 }));

    expect(await marcarLaborBorrada(db, 'a', DESPUES)).toBe(1);
    expect(await marcarLaborBorrada(db, 'a', DESPUES)).toBe(0);
    expect(await marcarLaboresDeLoteBorradas(db, 'lote-1', DESPUES)).toBe(1);

    expect(await db.getAllAsync('SELECT id, deleted_at, pending FROM labor ORDER BY id')).toEqual([
      { id: 'a', deleted_at: DESPUES, pending: 1 },
      { id: 'b', deleted_at: DESPUES, pending: 1 },
      { id: 'c', deleted_at: null, pending: 0 },
    ]);
  });

  it('listarCosechasDeLote devuelve solo las cosechas vivas de ese lote', async () => {
    const db = await baseConLotes();
    await insertarLabor(
      db,
      laborFila({ id: 'a', tipo: 'cosecha', fecha: '2026-10-01', cantidad: 12.5 }),
    );
    await insertarLabor(
      db,
      laborFila({ id: 'b', tipo: 'cosecha', fecha: '2026-11-02', cantidad: 8 }),
    );
    await insertarLabor(
      db,
      laborFila({ id: 'c', tipo: 'cosecha', fecha: '2026-11-03', cantidad: 99 }),
    );
    await insertarLabor(db, laborFila({ id: 'd', tipo: 'riego', cantidad: 50 }));
    await insertarLabor(
      db,
      laborFila({ id: 'e', lote_id: 'lote-2', tipo: 'cosecha', cantidad: 7 }),
    );
    await marcarLaborBorrada(db, 'c', DESPUES);

    expect(await listarCosechasDeLote(db, 'lote-1')).toEqual([
      { fecha: '2026-10-01', cantidad: 12.5 },
      { fecha: '2026-11-02', cantidad: 8 },
    ]);
  });
});
