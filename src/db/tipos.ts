export type ParametroSql = string | number | null;

/**
 * Lo mínimo que los repositorios necesitan de una base SQLite. `expo-sqlite` lo cumple en el
 * teléfono y `node:sqlite` en las pruebas (D38). Los parámetros van siempre aparte del SQL.
 */
export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: readonly ParametroSql[]): Promise<{ readonly changes: number }>;
  getFirstAsync<T>(sql: string, params?: readonly ParametroSql[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: readonly ParametroSql[]): Promise<T[]>;
  withTransactionAsync(tarea: () => Promise<void>): Promise<void>;
  /**
   * Transacción en una conexión APARTE (D96): lo que se escriba por esta base mientras dura NO entra en ella, y
   * si falla solo se deshace lo suyo. La tarea recibe la base de esa conexión y debe usar SOLO esa.
   */
  withExclusiveTransactionAsync(tarea: (tx: Db) => Promise<void>): Promise<void>;
}
