import { insertarLote, obtenerLote as leerLote } from '@/repositories/loteRepository';
import { actualizarLabor, borrarLabor, crearLabor } from '@/services/laborService';
import { actualizarLote, borrarLote, crearLote } from '@/services/loteService';
import { sincronizar } from '@/services/sincronizacionService';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearFotosEnMemoria } from '../helpers/fotosEnMemoria';
import { loteFila } from '../helpers/filas';
import { crearServidorFalso } from '../helpers/servidorFalso';

const estadoLocal = (ctx: Awaited<ReturnType<typeof crearDispositivo>>['ctx'], tabla: string) =>
  ctx.db.getAllAsync<{ id: string; pending: number; sync_error: string | null }>(
    `SELECT id, pending, sync_error FROM ${tabla} ORDER BY id`,
  );

describe('sincronizar: enviar lo pendiente', () => {
  it('sube el lote y su labor (primero los lotes), y los da por sincronizados', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado).toEqual({
      ok: true,
      resumen: { enviados: 2, recibidos: 2, descartados: 0, conAviso: 0 },
    });
    expect(servidor.lotes.get('a-1')).toEqual(expect.objectContaining({ nombre: 'El Mirador' }));
    expect(servidor.labores.get('a-2')).toEqual(expect.objectContaining({ lote_id: 'a-1' }));
    const puts = servidor.llamadasA('PUT').map((l) => l.ruta);
    expect(puts).toEqual(['/api/lotes/a-1', '/api/labores/a-2']);
    expect(await estadoLocal(ctx, 'lote')).toEqual([{ id: 'a-1', pending: 0, sync_error: null }]);
    expect(await estadoLocal(ctx, 'labor')).toEqual([{ id: 'a-2', pending: 0, sync_error: null }]);
  });

  it('envía solo los campos que acepta la API (nada de pending, sync_error ni foto_uri)', async () => {
    const { ctx: base } = await crearDispositivo();
    const fotos = crearFotosEnMemoria();
    fotos.sembrar('file:///cache/a.jpg');
    const ctx = { ...base, fotos };
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor({ foto_uri: 'file:///cache/a.jpg' }));

    await sincronizar(ctx, servidor);

    const [lote, labor] = servidor.llamadasA('PUT');
    expect(Object.keys(lote?.cuerpo as object).sort()).toEqual([
      'altitud_m',
      'area_m2',
      'cultivo',
      'fecha_siembra',
      'lat',
      'lng',
      'nombre',
    ]);
    expect(Object.keys(labor?.cuerpo as object).sort()).toEqual([
      'cantidad',
      'fecha',
      'foto_url',
      'lote_id',
      'luz',
      'nota',
      'tipo',
      'unidad',
    ]);
  });

  it('una segunda vuelta sin cambios no envía nada', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await sincronizar(ctx, servidor);
    servidor.llamadas.length = 0;

    await sincronizar(ctx, servidor);

    expect(servidor.llamadasA('PUT')).toEqual([]);
    expect(servidor.llamadasA('DELETE')).toEqual([]);
  });

  it('un cambio posterior se vuelve a enviar y el servidor lo guarda', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await sincronizar(ctx, servidor);
    avanzar();

    await actualizarLote(ctx, 'a-1', datosLote({ nombre: 'El Mirador Alto' }));
    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.enviados).toBe(1);
    expect(servidor.lotes.get('a-1')?.nombre).toBe('El Mirador Alto');
    expect(await estadoLocal(ctx, 'lote')).toEqual([{ id: 'a-1', pending: 0, sync_error: null }]);
  });

  it('borrar un lote envía el borrado del lote y de cada labor', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());
    await sincronizar(ctx, servidor);
    avanzar();
    servidor.llamadas.length = 0;

    await borrarLote(ctx, 'a-1');
    await sincronizar(ctx, servidor);

    expect(servidor.llamadasA('DELETE').map((l) => l.ruta)).toEqual([
      '/api/lotes/a-1',
      '/api/labores/a-2',
    ]);
    expect(servidor.lotes.get('a-1')?.deleted_at).not.toBeNull();
    expect(servidor.labores.get('a-2')?.deleted_at).not.toBeNull();
    expect(await estadoLocal(ctx, 'lote')).toEqual([{ id: 'a-1', pending: 0, sync_error: null }]);
  });

  it('crear y borrar sin haber sincronizado: el 404 del servidor cuenta como hecho', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await borrarLote(ctx, 'a-1');

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok).toBe(true);
    expect(await estadoLocal(ctx, 'lote')).toEqual([{ id: 'a-1', pending: 0, sync_error: null }]);
  });

  it('borrar una labor suelta también se envía', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());
    await sincronizar(ctx, servidor);
    avanzar();

    await borrarLabor(ctx, 'a-2');
    await sincronizar(ctx, servidor);

    expect(servidor.labores.get('a-2')?.deleted_at).not.toBeNull();
  });

  it('si el usuario edita mientras se envía, ese cambio NO se da por enviado: sigue pendiente', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    servidor.estado.alResponder = async (metodo) => {
      if (metodo !== 'PUT') return;
      avanzar();
      await actualizarLote(ctx, 'a-1', datosLote({ nombre: 'Editado en medio' }));
      servidor.estado.alResponder = null;
    };

    await sincronizar(ctx, servidor);

    expect(await leerLote(ctx.db, 'a-1')).toEqual(
      expect.objectContaining({ nombre: 'Editado en medio', pending: 1 }),
    );
    avanzar();
    await sincronizar(ctx, servidor);
    expect(servidor.lotes.get('a-1')?.nombre).toBe('Editado en medio');
  });

  it('una labor editada se vuelve a enviar con sus datos nuevos', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'a-1', datosLabor());
    await sincronizar(ctx, servidor);
    avanzar();

    await actualizarLabor(ctx, 'a-2', datosLabor({ cantidad: 77 }));
    await sincronizar(ctx, servidor);

    expect(servidor.labores.get('a-2')?.cantidad).toBe(77);
  });
});

describe('sincronizar: el servidor rechaza un cambio (D73)', () => {
  const NOMBRE_REPETIDO =
    'Ya existe otro lote con ese nombre en tu cuenta (quizá lo creaste en otro dispositivo). Cámbiale el nombre para sincronizarlo.';

  it('409 de nombre: el lote queda con aviso y pendiente, y las demás cosas siguen enviándose', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.guardar('lotes', 'otro-telefono', {
      ...datosLote(),
      altitud_m: 1,
    });
    await crearLote(ctx, datosLote({ nombre: 'el mirador' }));
    await crearLote(ctx, datosLote({ nombre: 'Otro lote' }));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen).toEqual(
      expect.objectContaining({ enviados: 1, conAviso: 1 }),
    );
    // El lote del otro teléfono también llega y convive con el de aviso (el índice único lo permite).
    expect(await estadoLocal(ctx, 'lote')).toEqual([
      { id: 'a-1', pending: 1, sync_error: NOMBRE_REPETIDO },
      { id: 'a-2', pending: 0, sync_error: null },
      { id: 'otro-telefono', pending: 0, sync_error: null },
    ]);
  });

  it('las labores de un lote con aviso esperan: no se envían ni se marcan con error', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.guardar('lotes', 'otro-telefono', datosLote());
    await crearLote(ctx, datosLote({ nombre: 'EL MIRADOR' }));
    await crearLabor(ctx, 'a-1', datosLabor());

    await sincronizar(ctx, servidor);

    expect(servidor.llamadasA('PUT').map((l) => l.ruta)).toEqual(['/api/lotes/a-1']);
    expect(await estadoLocal(ctx, 'labor')).toEqual([{ id: 'a-2', pending: 1, sync_error: null }]);
  });

  it('al renombrar el lote con aviso, la siguiente vuelta lo envía y se lleva sus labores', async () => {
    const { ctx, avanzar } = await crearDispositivo();
    const servidor = crearServidorFalso();
    servidor.guardar('lotes', 'otro-telefono', datosLote());
    await crearLote(ctx, datosLote({ nombre: 'El Mirador' }));
    await crearLabor(ctx, 'a-1', datosLabor());
    await sincronizar(ctx, servidor);
    avanzar();

    await actualizarLote(ctx, 'a-1', datosLote({ nombre: 'El Mirador 2' }));
    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.conAviso).toBe(0);
    expect(servidor.lotes.get('a-1')?.nombre).toBe('El Mirador 2');
    expect(servidor.labores.get('a-2')).toBeDefined();
    expect(await estadoLocal(ctx, 'lote')).toEqual(
      expect.arrayContaining([{ id: 'a-1', pending: 0, sync_error: null }]),
    );
  });

  it('un 400 de una labor (su lote no existe en el servidor) la deja con aviso y sigue', async () => {
    const { ctx } = await crearDispositivo();
    const servidor = crearServidorFalso();
    await insertarLote(ctx.db, loteFila({ id: 'lote-fantasma', pending: 0 }));
    await crearLabor(ctx, 'lote-fantasma', datosLabor());
    await crearLote(ctx, datosLote({ nombre: 'Otro' }));

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.conAviso).toBe(1);
    expect(await estadoLocal(ctx, 'labor')).toEqual([
      { id: 'a-1', pending: 1, sync_error: 'El servidor la rechazó: El lote no existe.' },
    ]);
    expect(servidor.lotes.get('a-2')).toBeDefined();
  });
});
