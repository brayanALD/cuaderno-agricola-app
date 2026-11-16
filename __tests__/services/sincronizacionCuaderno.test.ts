import { cerrarCiclo, listarCiclos } from '@/services/cicloService';
import { crearLabor, listarLaboresDeLote } from '@/services/laborService';
import { borrarLote, crearLote, listarLotesConDias, obtenerLote } from '@/services/loteService';
import { sincronizar } from '@/services/sincronizacionService';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { crearServidorFalso } from '../helpers/servidorFalso';

describe('sincronizar los datos de cuaderno agrícola entre dos teléfonos (D95)', () => {
  it('la finca, el producto, la carencia y el costo llegan al otro teléfono', async () => {
    const servidor = crearServidorFalso();
    const a = await crearDispositivo('a');
    const b = await crearDispositivo('b');
    await crearLote(a.ctx, datosLote({ finca: 'La Aurora' }));
    await crearLabor(
      a.ctx,
      'a-1',
      datosLabor({ tipo: 'fumigacion', producto: 'Mancozeb', carencia_dias: 21, costo: 35000 }),
    );

    await sincronizar(a.ctx, servidor);
    await sincronizar(b.ctx, servidor);

    expect(await obtenerLote(b.ctx, 'a-1')).toMatchObject({ finca: 'La Aurora', pending: 0 });
    expect((await listarLaboresDeLote(b.ctx, 'a-1'))[0]).toMatchObject({
      producto: 'Mancozeb',
      carencia_dias: 21,
      costo: 35000,
    });
  });

  it('un lote de un servidor o teléfono ANTIGUO (sin los campos nuevos) se acepta con null', async () => {
    const servidor = crearServidorFalso();
    const { ctx } = await crearDispositivo('a');
    servidor.sembrar('lotes', {
      id: 'viejo',
      nombre: 'Lote viejo',
      cultivo: 'Café',
      area_m2: 100,
      altitud_m: null,
      lat: null,
      lng: null,
      fecha_siembra: '2026-08-01',
    });
    servidor.sembrar('labores', {
      id: 'labor-vieja',
      lote_id: 'viejo',
      tipo: 'riego',
      fecha: '2026-11-01',
      cantidad: 5,
      unidad: 'L',
      nota: null,
      foto_url: null,
      luz: null,
    });

    const resultado = await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.descartados).toBe(0);
    expect(await obtenerLote(ctx, 'viejo')).toMatchObject({ finca: null });
    expect((await listarLaboresDeLote(ctx, 'viejo'))[0]).toMatchObject({
      producto: null,
      carencia_dias: null,
      costo: null,
    });
  });

  it('la búsqueda de lotes también encuentra por finca', async () => {
    const { ctx } = await crearDispositivo('a');
    await crearLote(ctx, datosLote({ nombre: 'Uno', finca: 'La Aurora' }));
    await crearLote(ctx, datosLote({ nombre: 'Dos', finca: 'El Recreo' }));

    expect((await listarLotesConDias(ctx, 'aurora')).map((l) => l.nombre)).toEqual(['Uno']);
  });

  it('un ciclo cerrado sube después de su lote y aparece en el otro teléfono', async () => {
    const servidor = crearServidorFalso();
    const a = await crearDispositivo('a');
    const b = await crearDispositivo('b');
    await crearLote(a.ctx, datosLote());
    await sincronizar(a.ctx, servidor);
    a.avanzar();
    await cerrarCiclo(a.ctx, 'a-1', {
      fecha_fin: '2026-11-10',
      cultivo: 'Maíz',
      fecha_siembra: '2026-11-12',
    });

    await sincronizar(a.ctx, servidor);
    await sincronizar(b.ctx, servidor);

    const rutas = servidor.llamadasA('PUT').map((l) => l.ruta.split('/')[2]);
    expect(rutas.lastIndexOf('lotes')).toBeLessThan(rutas.indexOf('ciclos'));
    expect(servidor.ciclos.size).toBe(1);
    expect(await obtenerLote(b.ctx, 'a-1')).toMatchObject({ cultivo: 'Maíz' });
    expect(await listarCiclos(b.ctx, 'a-1')).toEqual([
      expect.objectContaining({ cultivo: 'Café', fecha_fin: '2026-11-10', pending: 0 }),
    ]);
  });

  it('una segunda vuelta no reenvía el ciclo; borrar el lote borra el ciclo también en el servidor', async () => {
    const servidor = crearServidorFalso();
    const { ctx, avanzar } = await crearDispositivo('a');
    await crearLote(ctx, datosLote());
    await cerrarCiclo(ctx, 'a-1', {
      fecha_fin: '2026-11-10',
      cultivo: 'Maíz',
      fecha_siembra: '2026-11-12',
    });
    await sincronizar(ctx, servidor);
    servidor.llamadas.length = 0;

    await sincronizar(ctx, servidor);
    expect(servidor.llamadasA('PUT')).toEqual([]);

    avanzar();
    await borrarLote(ctx, 'a-1');
    await sincronizar(ctx, servidor);

    expect([...servidor.ciclos.values()].every((c) => c.deleted_at !== null)).toBe(true);
  });

  it('un ciclo inválido del servidor se descarta y uno sin su lote espera (no avanza el cursor)', async () => {
    const servidor = crearServidorFalso();
    const { ctx } = await crearDispositivo('a');
    servidor.sembrar('ciclos', { id: 'malo', lote_id: 'x', cultivo: '', fecha_inicio: 'ayer' });
    servidor.sembrar('ciclos', {
      id: 'huerfano',
      lote_id: 'no-esta',
      cultivo: 'Café',
      fecha_inicio: '2026-01-01',
      fecha_fin: '2026-06-01',
      total_kg: 10,
    });

    const resultado = await sincronizar(ctx, servidor);
    servidor.llamadas.length = 0;
    await sincronizar(ctx, servidor);

    expect(resultado.ok && resultado.resumen.descartados).toBe(1);
    expect(servidor.llamadasA('GET').map((l) => l.ruta)).toContain('/api/ciclos');
  });
});
