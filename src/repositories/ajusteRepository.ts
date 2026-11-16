import type { Db } from '@/db/tipos';

/** Lee un ajuste de este teléfono y cuenta (D90); `null` si nunca se guardó. */
export async function leerAjuste(db: Db, clave: string): Promise<string | null> {
  const fila = await db.getFirstAsync<{ valor: string }>(
    'SELECT valor FROM ajustes WHERE clave = ?',
    [clave],
  );
  return fila?.valor ?? null;
}

export async function guardarAjuste(db: Db, clave: string, valor: string): Promise<void> {
  await db.runAsync(
    'INSERT INTO ajustes (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor',
    [clave, valor],
  );
}
