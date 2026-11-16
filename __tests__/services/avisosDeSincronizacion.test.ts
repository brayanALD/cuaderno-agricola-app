import { marcarLaborConError } from '@/repositories/laborRepository';
import { marcarLoteConError, obtenerLote as leerLote } from '@/repositories/loteRepository';
import { actualizarLabor, crearLabor, duplicarLabor, obtenerLabor } from '@/services/laborService';
import { actualizarLote, crearLote } from '@/services/loteService';
import { AHORA } from '../helpers/filas';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

describe('avisos de sincronización (D73)', () => {
  it('crear un lote o una labor empieza sin aviso', async () => {
    const ctx = await crearContextoDePrueba();

    const lote = await crearLote(ctx, datosLote());
    const labor = await crearLabor(ctx, 'id-1', datosLabor());

    expect(lote.ok && lote.valor.sync_error).toBeNull();
    expect(labor.ok && labor.valor.sync_error).toBeNull();
  });

  it('editar un lote con aviso lo quita y lo deja pendiente para volver a enviarlo', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    await marcarLoteConError(ctx.db, 'id-1', AHORA, 'Ya existe otro lote con ese nombre.');

    const resultado = await actualizarLote(ctx, 'id-1', datosLote({ nombre: 'El Mirador 2' }));

    expect(resultado.ok && resultado.valor.sync_error).toBeNull();
    expect(await leerLote(ctx.db, 'id-1')).toEqual(
      expect.objectContaining({ nombre: 'El Mirador 2', pending: 1, sync_error: null }),
    );
  });

  it('editar una labor con aviso lo quita', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'id-1', datosLabor());
    await marcarLaborConError(ctx.db, 'id-2', AHORA, 'Rechazada');

    await actualizarLabor(ctx, 'id-2', datosLabor({ cantidad: 30 }));

    expect(await obtenerLabor(ctx, 'id-2')).toEqual(
      expect.objectContaining({ cantidad: 30, pending: 1, sync_error: null }),
    );
  });

  it('duplicar una labor con aviso no copia el aviso', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'id-1', datosLabor());
    await marcarLaborConError(ctx.db, 'id-2', AHORA, 'Rechazada');

    const copia = await duplicarLabor(ctx, 'id-2');

    expect(copia.ok && copia.valor.sync_error).toBeNull();
  });
});
