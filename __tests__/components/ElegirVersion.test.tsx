import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FichaLote } from '@/components/DetalleLote';
import { guardarConflicto } from '@/repositories/conflictoRepository';
import { crearLote, obtenerLote } from '@/services/loteService';
import { MENSAJE_CONFLICTO } from '@/services/sync/errores';
import { crearContextoDePrueba, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';

const REMOTO = {
  id: 'id-1',
  nombre: 'Del otro teléfono',
  cultivo: 'Maíz',
  finca: null,
  area_m2: 6000,
  altitud_m: 1650,
  lat: 4.65,
  lng: -75.57,
  fecha_siembra: '2026-08-16',
  created_at: '2026-11-14T15:00:00.000Z',
  updated_at: '2026-11-14T16:00:00.000Z',
  deleted_at: null,
};

async function conConflicto() {
  const ctx = await crearContextoDePrueba();
  await crearLote(ctx, datosLote());
  await ctx.db.execAsync("UPDATE lote SET version_servidor = '2026-11-14T14:00:00.000Z'");
  await guardarConflicto(ctx.db, 'lote', 'id-1', JSON.stringify(REMOTO), MENSAJE_CONFLICTO);
  const Envoltorio = crearEnvoltorio(ctx);
  await render(
    <Envoltorio>
      <FichaLote id="id-1" />
    </Envoltorio>,
  );
  return ctx;
}

describe('elegir qué versión conservar (D96)', () => {
  it('un lote en conflicto explica qué pasó y ofrece las dos versiones', async () => {
    await conConflicto();

    expect(await screen.findByText(/se cambió en otro dispositivo/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Quedarme con la mía' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Usar la del otro dispositivo' })).toBeTruthy();
  });

  it('un lote sin conflicto no muestra nada de esto', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    const Envoltorio = crearEnvoltorio(ctx);

    await render(
      <Envoltorio>
        <FichaLote id="id-1" />
      </Envoltorio>,
    );

    expect(await screen.findByText('El Mirador')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Quedarme con la mía' })).toBeNull();
  });

  it('«Quedarme con la mía» lo deja pendiente de enviar y quita la pregunta', async () => {
    const ctx = await conConflicto();

    fireEvent.press(await screen.findByRole('button', { name: 'Quedarme con la mía' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Quedarme con la mía' })).toBeNull(),
    );
    expect(await obtenerLote(ctx, 'id-1')).toMatchObject({
      nombre: 'El Mirador',
      pending: 1,
      sync_error: null,
      conflicto: null,
      version_servidor: REMOTO.updated_at,
    });
  });

  it('«Usar la del otro dispositivo» reemplaza el lote por el del servidor', async () => {
    const ctx = await conConflicto();

    fireEvent.press(await screen.findByRole('button', { name: 'Usar la del otro dispositivo' }));

    expect(await screen.findByText('Del otro teléfono')).toBeTruthy();
    expect(await obtenerLote(ctx, 'id-1')).toMatchObject({
      nombre: 'Del otro teléfono',
      cultivo: 'Maíz',
      pending: 0,
      conflicto: null,
    });
  });
});
