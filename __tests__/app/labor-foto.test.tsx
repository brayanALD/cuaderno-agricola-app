import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import FotoDeLabor from '../../app/(app)/foto/[id]';
import EditarLabor from '../../app/(app)/labor/[id]';
import NuevaLabor from '../../app/(app)/labor/nueva';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { Raiz } from '../helpers/gestos';

const mockRouter = { push: jest.fn(), back: jest.fn(), setParams: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

type Contexto = Awaited<ReturnType<typeof crearContextoDePrueba>>;

async function montar(
  pantalla: () => React.JSX.Element,
  sembrar?: (ctx: Contexto) => Promise<void>,
) {
  const ctx = await crearContextoDePrueba();
  await sembrar?.(ctx);
  const Envoltorio = crearEnvoltorio(ctx);
  await render(
    <Raiz>
      <Envoltorio>{pantalla()}</Envoltorio>
    </Raiz>,
  );
  return ctx;
}

const conLote = async (ctx: Contexto) => {
  await crearLote(ctx, datosLote());
};

beforeEach(() => {
  mockRouter.back.mockReset();
  mockParams = {};
});

describe('labor/nueva', () => {
  it('registra la labor del lote indicado, pendiente de sincronizar, y vuelve atrás', async () => {
    mockParams = { lote: 'id-1' };
    const ctx = await montar(() => <NuevaLabor />, conLote);
    await fireEvent.press(await screen.findByRole('button', { name: 'Aumentar cantidad' }));
    await fireEvent.changeText(screen.getByLabelText('Nota (opcional)'), 'Goteo');

    await fireEvent.press(screen.getByRole('button', { name: 'Registrar labor' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(
      await ctx.db.getAllAsync('SELECT lote_id, tipo, cantidad, nota, pending FROM labor'),
    ).toEqual([{ lote_id: 'id-1', tipo: 'riego', cantidad: 1, nota: 'Goteo', pending: 1 }]);
  });

  it('un lote que no existe no permite registrar labores', async () => {
    mockParams = { lote: 'nada' };
    await montar(() => <NuevaLabor />);

    expect(await screen.findByText('Este lote ya no existe')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Registrar labor' })).toBeNull();
  });
});

describe('labor/[id]', () => {
  const conLabor = async (ctx: Contexto) => {
    await conLote(ctx);
    await crearLabor(ctx, 'id-1', datosLabor({ nota: 'Goteo', cantidad: 5 }));
  };

  it('muestra la labor y guarda los cambios', async () => {
    mockParams = { id: 'id-2' };
    const ctx = await montar(() => <EditarLabor />, conLabor);
    expect((await screen.findByLabelText('Nota (opcional)')).props.value).toBe('Goteo');

    await fireEvent.changeText(screen.getByLabelText('Nota (opcional)'), 'Goteo en la zona alta');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await ctx.db.getFirstAsync('SELECT nota, cantidad FROM labor')).toEqual({
      nota: 'Goteo en la zona alta',
      cantidad: 5,
    });
  });

  it('una labor que no existe lo dice', async () => {
    mockParams = { id: 'nada' };
    await montar(() => <EditarLabor />);

    expect(await screen.findByText('Esta labor ya no existe')).toBeTruthy();
  });

  it('si el lote de la labor ya no existe, no se puede editar', async () => {
    mockParams = { id: 'id-2' };
    await montar(
      () => <EditarLabor />,
      async (ctx) => {
        await conLabor(ctx);
        await ctx.db.runAsync('UPDATE lote SET deleted_at = ? WHERE id = ?', [
          '2026-11-14T16:00:00.000Z',
          'id-1',
        ]);
      },
    );

    expect(await screen.findByText('El lote de esta labor ya no existe')).toBeTruthy();
  });
});

describe('foto/[id]', () => {
  it('muestra la foto de la labor con su descripción y los botones de zoom', async () => {
    mockParams = { id: 'id-2' };
    await montar(
      () => <FotoDeLabor />,
      async (ctx) => {
        await conLote(ctx);
        await crearLabor(
          ctx,
          'id-1',
          datosLabor({ foto_uri: 'file:///galeria/riego.jpg', fecha: '2026-11-10' }),
        );
      },
    );

    expect(
      await screen.findByLabelText('Foto de la labor de riego del 10 de noviembre de 2026'),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Acercar la foto' })).toBeTruthy();
  });

  it('una labor sin foto lo explica', async () => {
    mockParams = { id: 'id-2' };
    await montar(
      () => <FotoDeLabor />,
      async (ctx) => {
        await conLote(ctx);
        await crearLabor(ctx, 'id-1', datosLabor());
      },
    );

    expect(await screen.findByText('Esta labor no tiene foto')).toBeTruthy();
  });

  it('una labor que no existe lo dice', async () => {
    mockParams = { id: 'nada' };
    await montar(() => <FotoDeLabor />);

    expect(await screen.findByText('Esta labor ya no existe')).toBeTruthy();
  });
});
