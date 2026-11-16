import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import PantallaLotes from '../../app/(app)/(tabs)/index';
import PantallaLabores from '../../app/(app)/(tabs)/labores';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { Raiz } from '../helpers/gestos';

const mockRouter = { push: jest.fn(), back: jest.fn(), setParams: jest.fn() };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  mockRouter.push.mockReset();
});

async function montar(
  pantalla: () => React.JSX.Element,
  sembrar?: (ctx: Awaited<ReturnType<typeof crearContextoDePrueba>>) => Promise<void>,
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

describe('pestaña Lotes', () => {
  it('sin lotes explica qué hacer y ofrece crear el primero', async () => {
    await montar(() => <PantallaLotes />);

    expect(await screen.findByText('Aún no hay lotes')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Nuevo lote' })[0]!);

    expect(mockRouter.push).toHaveBeenCalledWith('/lote/nuevo');
  });

  it('criterio 1: un lote sembrado hace 90 días muestra «90 días» y abre su ficha', async () => {
    await montar(
      () => <PantallaLotes />,
      async (ctx) => {
        await crearLote(ctx, datosLote({ fecha_siembra: '2026-08-16' }));
      },
    );

    expect(await screen.findByText('90 días')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Lote El Mirador, Café, 90 días/ }));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/lote/[id]',
      params: { id: 'id-1' },
    });
  });

  it('busca por nombre o cultivo y avisa si nada coincide', async () => {
    await montar(
      () => <PantallaLotes />,
      async (ctx) => {
        await crearLote(ctx, datosLote({ nombre: 'Uno', cultivo: 'Café' }));
        await crearLote(ctx, datosLote({ nombre: 'Dos', cultivo: 'Aguacate' }));
      },
    );
    await screen.findByText('Uno');

    await fireEvent.changeText(screen.getByLabelText('Buscar lote o cultivo'), 'aguacate');
    await waitFor(() => expect(screen.queryByText('Uno')).toBeNull());
    expect(screen.getByText('Dos')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Buscar lote o cultivo'), 'zzz');
    expect(await screen.findByText('Sin resultados')).toBeTruthy();
  });

  it('el botón «Nuevo lote» sigue disponible con lotes', async () => {
    await montar(
      () => <PantallaLotes />,
      async (ctx) => {
        await crearLote(ctx, datosLote());
      },
    );
    await screen.findByText('El Mirador');

    await fireEvent.press(screen.getByRole('button', { name: 'Nuevo lote' }));

    expect(mockRouter.push).toHaveBeenCalledWith('/lote/nuevo');
  });
});

describe('pestaña Labores', () => {
  const sembrar = async (ctx: Awaited<ReturnType<typeof crearContextoDePrueba>>) => {
    await crearLote(ctx, datosLote());
    await crearLabor(ctx, 'id-1', datosLabor({ nota: 'Limpiar la zanja', fecha: '2026-11-12' }));
  };

  it('sin datos muestra los estados vacíos de próximas y recientes', async () => {
    await montar(() => <PantallaLabores />);

    expect(await screen.findByText('Sin lotes todavía')).toBeTruthy();
    expect(screen.getByText('Aún no hay labores')).toBeTruthy();
  });

  it('muestra la próxima labor sugerida de cada lote y las labores recientes con su lote', async () => {
    await montar(() => <PantallaLabores />, sembrar);

    expect(await screen.findByText('Próximas labores')).toBeTruthy();
    expect(await screen.findByText('Lote: El Mirador')).toBeTruthy();
    expect(screen.getByText('Limpiar la zanja')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: /sugerido en El Mirador/ })[0]!);

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/lote/[id]',
      params: { id: 'id-1' },
    });
  });

  it('duplicar con el botón agrega la labor con la fecha de hoy y lo avisa', async () => {
    await montar(() => <PantallaLabores />, sembrar);
    await screen.findByText('Limpiar la zanja');

    await fireEvent.press(screen.getByRole('button', { name: /^Duplicar la labor de riego/ }));

    expect(await screen.findByText('Labor duplicada con la fecha de hoy.')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getAllByText('14 de noviembre de 2026').length).toBeGreaterThan(0),
    );
  });

  it('busca por nota y avisa si nada coincide', async () => {
    await montar(() => <PantallaLabores />, sembrar);
    await screen.findByText('Limpiar la zanja');

    await fireEvent.changeText(screen.getByLabelText('Buscar labor (tipo o nota)'), 'zanja');
    expect(await screen.findByText('Resultados')).toBeTruthy();
    expect(screen.queryByText('Próximas labores')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Buscar labor (tipo o nota)'), 'xyz');
    expect(await screen.findByText('Sin resultados')).toBeTruthy();
  });

  it('editar y ver foto navegan a sus pantallas', async () => {
    await montar(
      () => <PantallaLabores />,
      async (ctx) => {
        await crearLote(ctx, datosLote());
        await crearLabor(ctx, 'id-1', datosLabor({ foto_uri: 'file:///f.jpg' }));
      },
    );
    await screen.findByText('Lote: El Mirador');

    await fireEvent.press(screen.getByRole('button', { name: /Editar$/ }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/labor/[id]',
      params: { id: 'id-2' },
    });

    await fireEvent.press(screen.getByRole('imagebutton', { name: /Ver la foto/ }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/foto/[id]',
      params: { id: 'id-2' },
    });
  });
});
