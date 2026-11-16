import type { Db } from '@/db/tipos';
import { sincronizar } from '@/services/sincronizacionService';
import { crearDbMigrada } from '../helpers/baseEnMemoria';
import { datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearServidorFalso } from '../helpers/servidorFalso';
import { crearLote } from '@/services/loteService';

describe('withExclusiveTransactionAsync (D96)', () => {
  it('confirma lo que escribe la tarea y le entrega una base utilizable', async () => {
    const db = await crearDbMigrada();

    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync("INSERT INTO ajustes (clave, valor) VALUES ('a', '1')");
    });

    expect(await db.getFirstAsync('SELECT valor FROM ajustes WHERE clave = ?', ['a'])).toEqual({
      valor: '1',
    });
  });

  it('si la tarea falla, se deshace todo lo suyo y el error sale tal cual', async () => {
    const db = await crearDbMigrada();

    await expect(
      db.withExclusiveTransactionAsync(async (tx) => {
        await tx.runAsync("INSERT INTO ajustes (clave, valor) VALUES ('a', '1')");
        throw new Error('se cortó a la mitad de la página');
      }),
    ).rejects.toThrow('se cortó a la mitad de la página');

    expect(await db.getAllAsync('SELECT clave FROM ajustes')).toEqual([]);
  });
});

describe('la sincronización aplica lo recibido en una transacción exclusiva', () => {
  it('cada página que llega se aplica por la conexión exclusiva', async () => {
    const servidor = crearServidorFalso();
    const a = await crearDispositivo('a');
    const b = await crearDispositivo('b');
    await crearLote(a.ctx, datosLote());
    await sincronizar(a.ctx, servidor);
    const exclusivas = jest.fn();
    const db: Db = {
      ...b.ctx.db,
      withExclusiveTransactionAsync: (tarea) => {
        exclusivas();
        return b.ctx.db.withExclusiveTransactionAsync(tarea);
      },
    };

    const resultado = await sincronizar({ ...b.ctx, db }, servidor);

    // Una por recurso (lotes, ciclos y labores) aunque la página venga vacía.
    expect(exclusivas).toHaveBeenCalledTimes(3);
    expect(resultado.ok && resultado.resumen.recibidos).toBe(1);
  });

  it('si aplicar una página falla a medias, no queda nada de esa página y el cursor no avanza', async () => {
    const servidor = crearServidorFalso();
    const a = await crearDispositivo('a');
    const b = await crearDispositivo('b');
    await crearLote(a.ctx, datosLote({ nombre: 'Uno' }));
    await crearLote(a.ctx, datosLote({ nombre: 'Dos' }));
    await sincronizar(a.ctx, servidor);
    let inserciones = 0;
    const db: Db = {
      ...b.ctx.db,
      withExclusiveTransactionAsync: (tarea) =>
        b.ctx.db.withExclusiveTransactionAsync((tx) =>
          tarea({
            ...tx,
            runAsync: (sql, params) => {
              if (sql.includes('INSERT INTO lote') && (inserciones += 1) === 2) {
                return Promise.reject(new Error('Se llenó el almacenamiento'));
              }
              return tx.runAsync(sql, params);
            },
          }),
        ),
    };

    await expect(sincronizar({ ...b.ctx, db }, servidor)).rejects.toThrow('almacenamiento');

    expect(await b.ctx.db.getAllAsync('SELECT id FROM lote')).toEqual([]);
    expect(
      await b.ctx.db.getAllAsync("SELECT 1 FROM sync_estado WHERE clave = 'since_lotes'"),
    ).toEqual([]);
  });
});
