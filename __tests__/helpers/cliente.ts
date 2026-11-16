import { crearAlmacenSesion } from '@/api/almacenSesion';
import { crearClienteApi, type FetchMinimo } from '@/api/cliente';
import { crearClaveValorEnMemoria } from './sesion';

export const URL_BASE = 'https://api.ejemplo.app';

export type FetchSimulado = jest.Mock<ReturnType<FetchMinimo>, Parameters<FetchMinimo>>;

export function montar(fetchImpl: FetchSimulado) {
  const claveValor = crearClaveValorEnMemoria();
  const almacen = crearAlmacenSesion(claveValor);
  const alExpirar = jest.fn();
  const cliente = crearClienteApi({ urlBase: URL_BASE, almacen, fetchImpl });
  cliente.alExpirar(alExpirar);
  return { cliente, almacen, alExpirar, claveValor };
}

export const nuevoFetch = (): FetchSimulado => jest.fn();

/** Los argumentos con los que se llamó a `fetch` en la llamada número `n` (0 = la primera). */
export function llamada(fetchImpl: FetchSimulado, n: number) {
  const argumentos = fetchImpl.mock.calls[n];
  if (argumentos === undefined) throw new Error(`fetch no se llamó ${String(n + 1)} veces`);
  const [url, init] = argumentos;
  const cuerpo: unknown = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
  return { url, init, cuerpo };
}
