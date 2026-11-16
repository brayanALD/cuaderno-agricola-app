import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { migrar } from '@/db/migraciones';
import type { Db, ParametroSql } from '@/db/tipos';

const valores = (params: readonly ParametroSql[]): SQLInputValue[] => [...params];

/** Implementación de `Db` sobre `node:sqlite` (D38): SQLite real, en memoria y con claves foráneas. */
export function crearDbEnMemoria(): Db {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  const db: Db = {
    execAsync: (sql) => {
      sqlite.exec(sql);
      return Promise.resolve();
    },
    runAsync: (sql, params = []) => {
      const resultado = sqlite.prepare(sql).run(...valores(params));
      return Promise.resolve({ changes: Number(resultado.changes) });
    },
    getFirstAsync: <T>(sql: string, params: readonly ParametroSql[] = []) =>
      Promise.resolve((sqlite.prepare(sql).get(...valores(params)) ?? null) as T | null),
    getAllAsync: <T>(sql: string, params: readonly ParametroSql[] = []) =>
      Promise.resolve(sqlite.prepare(sql).all(...valores(params)) as T[]),
    withTransactionAsync: async (tarea) => {
      sqlite.exec('BEGIN');
      try {
        await tarea();
        sqlite.exec('COMMIT');
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
    // Una sola conexión en memoria: la exclusiva se comporta como la normal (se prueba lo que escribe, no el bloqueo).
    withExclusiveTransactionAsync: (tarea) => db.withTransactionAsync(() => tarea(db)),
  };
  return db;
}

export async function crearDbMigrada(): Promise<Db> {
  const db = crearDbEnMemoria();
  await migrar(db);
  return db;
}
