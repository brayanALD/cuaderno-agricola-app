import { deleteDatabaseAsync, openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { migrar } from './migraciones';
import { NOMBRE_BASE_ANTIGUA, nombreDeBaseDeUsuario } from './nombreBase';
import type { Db } from './tipos';

/** Adapta `SQLiteDatabase` a la interfaz mínima `Db` (parámetros opcionales y de solo lectura). */
function comoDb(db: SQLiteDatabase): Db {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: async (sql, params = []) => {
      const resultado = await db.runAsync(sql, [...params]);
      return { changes: resultado.changes };
    },
    getFirstAsync: <T>(sql: string, params: readonly (string | number | null)[] = []) =>
      db.getFirstAsync<T>(sql, [...params]),
    getAllAsync: <T>(sql: string, params: readonly (string | number | null)[] = []) =>
      db.getAllAsync<T>(sql, [...params]),
    withTransactionAsync: (tarea) => db.withTransactionAsync(tarea),
  };
}

/**
 * Abre la base real del usuario (`cuaderno-<uid>.db`, D60). Según la documentación de `expo-sqlite`:
 * WAL para bases nuevas y `foreign_keys = ON` justo después de abrir (no tiene efecto dentro de una transacción).
 */
export async function abrirBaseDeDatos(uid: string): Promise<Db> {
  const sqlite = await openDatabaseAsync(nombreDeBaseDeUsuario(uid));
  await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const db = comoDb(sqlite);
  await migrar(db);
  return db;
}

/**
 * Borra la base de antes de las cuentas (D62). Es limpieza: si falla, la app sigue sin ella, porque
 * una base obsoleta que no se pudo borrar no debe impedir entrar.
 */
export async function borrarBaseAntigua(): Promise<void> {
  try {
    await deleteDatabaseAsync(NOMBRE_BASE_ANTIGUA);
  } catch {
    // Nada que hacer: se volverá a intentar en el próximo arranque.
  }
}
