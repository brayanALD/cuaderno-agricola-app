import { crearEjecutorUnico } from '@/services/sync/ejecutorUnico';

/** Una tarea que termina cuando el test lo decide. */
function tareaManual() {
  const pendientes: (() => void)[] = [];
  const tarea = jest.fn(
    () =>
      new Promise<void>((resolver) => {
        pendientes.push(resolver);
      }),
  );
  return {
    tarea,
    terminar: async () => {
      pendientes.shift()?.();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}

describe('crearEjecutorUnico', () => {
  it('cada llamada separada ejecuta la tarea', async () => {
    const tarea = jest.fn().mockResolvedValue(undefined);
    const lanzar = crearEjecutorUnico(tarea);

    await lanzar();
    await lanzar();

    expect(tarea).toHaveBeenCalledTimes(2);
  });

  it('lo que se pide mientras corre se junta en UNA ejecución más (no en una por petición)', async () => {
    const { tarea, terminar } = tareaManual();
    const lanzar = crearEjecutorUnico(tarea);

    const primera = lanzar();
    void lanzar();
    void lanzar();
    void lanzar();
    expect(tarea).toHaveBeenCalledTimes(1);

    await terminar();
    expect(tarea).toHaveBeenCalledTimes(2);
    await terminar();
    await primera;

    expect(tarea).toHaveBeenCalledTimes(2);
  });

  it('la promesa devuelta termina cuando acaba también la ejecución repetida', async () => {
    const { tarea, terminar } = tareaManual();
    const lanzar = crearEjecutorUnico(tarea);
    let terminada = false;

    const primera = lanzar().then(() => {
      terminada = true;
    });
    void lanzar();
    await terminar();
    expect(terminada).toBe(false);
    await terminar();
    await primera;

    expect(terminada).toBe(true);
  });

  it('si la tarea falla, rechaza y la siguiente llamada vuelve a intentarlo', async () => {
    const tarea = jest
      .fn()
      .mockRejectedValueOnce(new Error('falló'))
      .mockResolvedValueOnce(undefined);
    const lanzar = crearEjecutorUnico(tarea);

    await expect(lanzar()).rejects.toThrow('falló');
    await lanzar();

    expect(tarea).toHaveBeenCalledTimes(2);
  });
});
