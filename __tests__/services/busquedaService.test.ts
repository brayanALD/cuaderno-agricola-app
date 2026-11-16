import { buscarEnCuaderno, buscarSoloLabores } from '@/services/busquedaService';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';

async function contextoConDatos() {
  const ctx = await crearContextoDePrueba();
  await crearLote(ctx, datosLote({ nombre: 'El Mirador', cultivo: 'Café' }));
  await crearLote(ctx, datosLote({ nombre: 'La Loma', cultivo: 'Aguacate' }));
  await crearLabor(ctx, 'id-1', datosLabor({ tipo: 'abono', nota: 'Urea cerca del café' }));
  await crearLabor(ctx, 'id-2', datosLabor({ tipo: 'poda', nota: 'Ramas bajas' }));
  return ctx;
}

describe('buscarEnCuaderno (D39)', () => {
  it('encuentra lotes y labores que contienen el texto', async () => {
    const ctx = await contextoConDatos();

    const { lotes, labores } = await buscarEnCuaderno(ctx, 'CAF');

    expect(lotes.map((l) => l.nombre)).toEqual(['El Mirador']);
    expect(labores.map((l) => l.tipo)).toEqual(['abono']);
  });

  it('limitación aceptada en D39: no ignora tildes ni mayúsculas fuera de ASCII', async () => {
    const ctx = await contextoConDatos();

    expect((await buscarEnCuaderno(ctx, 'cafe')).lotes).toEqual([]);
    expect((await buscarEnCuaderno(ctx, 'CAFÉ')).lotes).toEqual([]);
    expect((await buscarEnCuaderno(ctx, 'café')).lotes).toHaveLength(1);
  });

  it('busca por tipo de labor', async () => {
    const ctx = await contextoConDatos();

    const { lotes, labores } = await buscarEnCuaderno(ctx, 'poda');

    expect(lotes).toEqual([]);
    expect(labores.map((l) => l.nota)).toEqual(['Ramas bajas']);
  });

  it('buscarSoloLabores devuelve únicamente las labores que coinciden', async () => {
    const ctx = await contextoConDatos();

    expect((await buscarSoloLabores(ctx, 'poda')).map((l) => l.tipo)).toEqual(['poda']);
    expect((await buscarSoloLabores(ctx, 'caf')).map((l) => l.tipo)).toEqual(['abono']);
    expect(await buscarSoloLabores(ctx, 'nada')).toEqual([]);
    expect(await buscarSoloLabores(ctx, '   ')).toEqual([]);
  });

  it('un texto en blanco no busca nada (la pantalla muestra la lista normal)', async () => {
    const ctx = await contextoConDatos();

    expect(await buscarEnCuaderno(ctx, '   ')).toEqual({ lotes: [], labores: [] });
  });
});
