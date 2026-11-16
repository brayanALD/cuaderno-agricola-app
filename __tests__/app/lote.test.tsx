import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import EditarLote from '../../app/(app)/lote/editar/[id]';
import DetalleDeLote from '../../app/(app)/lote/[id]';
import NuevoLote from '../../app/(app)/lote/nuevo';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { Raiz } from '../helpers/gestos';

const mockRouter = { push: jest.fn(), back: jest.fn(), setParams: jest.fn() };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  hasServicesEnabledAsync: jest.fn().mockResolvedValue(true),
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('expo-sensors', () => ({
  Barometer: {
    isAvailableAsync: jest.fn().mockResolvedValue(false),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(),
  },
}));

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

beforeEach(() => {
  mockRouter.push.mockReset();
  mockRouter.back.mockReset();
  mockRouter.setParams.mockReset();
  mockParams = {};
});

describe('lote/nuevo', () => {
  it('crea el lote, lo guarda pendiente de sincronizar y vuelve atrás', async () => {
    const ctx = await montar(() => <NuevoLote />);
    await fireEvent.changeText(await screen.findByLabelText('Nombre del lote'), 'La Loma');
    await fireEvent.changeText(screen.getByLabelText('Cultivo'), 'Aguacate');
    await fireEvent.changeText(screen.getByLabelText('Área (m²)'), '2500');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear lote' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(await ctx.db.getAllAsync('SELECT nombre, area_m2, pending FROM lote')).toEqual([
      { nombre: 'La Loma', area_m2: 2500, pending: 1 },
    ]);
  });

  it('un nombre repetido se explica junto al campo y no vuelve atrás', async () => {
    await montar(
      () => <NuevoLote />,
      async (ctx) => {
        await crearLote(ctx, datosLote({ nombre: 'La Loma' }));
      },
    );
    await fireEvent.changeText(await screen.findByLabelText('Nombre del lote'), 'la loma');
    await fireEvent.changeText(screen.getByLabelText('Cultivo'), 'Café');
    await fireEvent.changeText(screen.getByLabelText('Área (m²)'), '100');

    await fireEvent.press(screen.getByRole('button', { name: 'Crear lote' }));

    expect(await screen.findByText('Ya existe un lote con ese nombre.')).toBeTruthy();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });
});

describe('lote/editar/[id]', () => {
  it('muestra los datos del lote y guarda los cambios', async () => {
    mockParams = { id: 'id-1' };
    const ctx = await montar(
      () => <EditarLote />,
      async (c) => {
        await crearLote(c, datosLote());
      },
    );
    expect((await screen.findByLabelText('Nombre del lote')).props.value).toBe('El Mirador');

    await fireEvent.changeText(screen.getByLabelText('Área (m²)'), '9000');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(await ctx.db.getFirstAsync('SELECT area_m2 FROM lote')).toEqual({ area_m2: 9000 });
  });

  it('un lote que no existe lo dice en vez de mostrar un formulario vacío', async () => {
    mockParams = { id: 'nada' };
    await montar(() => <EditarLote />);

    expect(await screen.findByText('Este lote ya no existe')).toBeTruthy();
    expect(screen.queryByLabelText('Nombre del lote')).toBeNull();
  });
});

describe('lote/[id] (ficha)', () => {
  const sembrar = async (ctx: Contexto) => {
    await crearLote(ctx, datosLote({ nombre: 'Alfa', fecha_siembra: '2026-08-16' }));
    await crearLote(ctx, datosLote({ nombre: 'Beta' }));
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-10-05', cantidad: 12.5 }),
    );
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-02', cantidad: 8.25 }),
    );
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-10', cantidad: 3.1 }),
    );
  };

  it('criterios 1 y 2: «90 días» y el total de las 3 cosechas, exacto y por mes', async () => {
    mockParams = { id: 'id-1' };
    await montar(() => <DetalleDeLote />, sembrar);

    expect(await screen.findByText('90 días')).toBeTruthy();
    expect(await screen.findByText('23,85 kg')).toBeTruthy();
    expect(screen.getByLabelText('octubre de 2026: 12,5 kg')).toBeTruthy();
    expect(screen.getByLabelText('noviembre de 2026: 11,35 kg')).toBeTruthy();
    expect(screen.getByText('Lote 1 de 2')).toBeTruthy();
  });

  it('la lista de datos repite el gráfico como texto, para quien no ve las barras', async () => {
    mockParams = { id: 'id-1' };
    await montar(() => <DetalleDeLote />, sembrar);
    await screen.findByText('23,85 kg');
    expect(screen.queryByText('octubre de 2026: 12,5 kg')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Ver los datos en lista' }));

    expect(screen.getByText('octubre de 2026: 12,5 kg')).toBeTruthy();
    expect(screen.getByText('noviembre de 2026: 11,35 kg')).toBeTruthy();
  });

  it('muestra la próxima labor sugerida y la bitácora', async () => {
    mockParams = { id: 'id-1' };
    await montar(() => <DetalleDeLote />, sembrar);

    expect(await screen.findByText('Próxima labor sugerida')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Registrar riego' })).toBeTruthy();
    expect(
      await screen.findAllByRole('button', { name: /^Labor de cosecha .*\. Editar$/ }),
    ).toHaveLength(3);
  });

  it('filtra la bitácora por tipo con chips y explica cuando no hay de ese tipo', async () => {
    mockParams = { id: 'id-1' };
    await montar(() => <DetalleDeLote />, sembrar);
    await screen.findByText('23,85 kg');

    await fireEvent.press(screen.getByRole('button', { name: 'Riego' }));

    expect(screen.queryAllByRole('button', { name: /^Labor de cosecha/ })).toHaveLength(0);
    expect(screen.getByText('Este lote no tiene labores de riego.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Riego' }).props.accessibilityState).toMatchObject({
      selected: true,
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Todas' }));
    expect(await screen.findAllByRole('button', { name: /^Labor de cosecha/ })).toHaveLength(3);
  });

  it('un lote sin labores explica cómo empezar', async () => {
    mockParams = { id: 'id-2' };
    await montar(() => <DetalleDeLote />, sembrar);

    expect(await screen.findByText('Aún no hay labores')).toBeTruthy();
    expect(screen.getByText('Aún no hay cosechas')).toBeTruthy();
  });

  it('el menú ⋮ lleva a editar el lote y a cerrar el ciclo; el botón flotante, a registrar una labor', async () => {
    mockParams = { id: 'id-1' };
    await montar(() => <DetalleDeLote />, sembrar);
    await screen.findByText('90 días');

    await fireEvent.press(screen.getByRole('button', { name: 'Más acciones del lote' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Editar lote' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/lote/editar/[id]',
      params: { id: 'id-1' },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Más acciones del lote' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Cerrar ciclo' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/lote/ciclo/[id]',
      params: { id: 'id-1' },
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Registrar labor' }));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/labor/nueva',
      params: { lote: 'id-1' },
    });
  });

  it('«Registrar riego» abre el formulario con el tipo que toca ya elegido (menos pasos)', async () => {
    mockParams = { id: 'id-1' };
    await montar(() => <DetalleDeLote />, sembrar);

    await fireEvent.press(await screen.findByRole('button', { name: 'Registrar riego' }));

    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: '/labor/nueva',
      params: { lote: 'id-1', tipo: 'riego' },
    });
  });

  it('«Lote siguiente» cambia el parámetro id al lote vecino (alternativa al deslizar)', async () => {
    jest.useFakeTimers();
    mockParams = { id: 'id-1' };
    await montar(() => <DetalleDeLote />, sembrar);
    await act(async () => {
      jest.advanceTimersByTime(50);
    });

    await fireEvent.press(await screen.findByRole('button', { name: 'Lote siguiente' }));
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(mockRouter.setParams).toHaveBeenCalledWith({ id: 'id-2' });
    jest.useRealTimers();
  });

  it('borrar el lote pide confirmación y, si se acepta, borra el lote y sus labores y vuelve', async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockParams = { id: 'id-1' };
    const ctx = await montar(() => <DetalleDeLote />, sembrar);
    await screen.findByText('90 días');

    await fireEvent.press(screen.getByRole('button', { name: 'Más acciones del lote' }));
    await fireEvent.press(screen.getByRole('menuitem', { name: 'Borrar lote' }));
    const [titulo, , botones] = alerta.mock.calls[0] ?? [];
    expect(titulo).toBe('¿Borrar el lote?');
    expect(mockRouter.back).not.toHaveBeenCalled();

    await act(async () => {
      botones?.[1]?.onPress?.();
    });

    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(await ctx.db.getAllAsync('SELECT id FROM lote WHERE deleted_at IS NULL')).toEqual([
      { id: 'id-2' },
    ]);
    expect(await ctx.db.getAllAsync('SELECT id FROM labor WHERE deleted_at IS NULL')).toEqual([]);
    alerta.mockRestore();
  });

  it('un lote que no existe lo dice', async () => {
    mockParams = { id: 'nada' };
    await montar(() => <DetalleDeLote />);

    expect(await screen.findByText('Este lote ya no existe')).toBeTruthy();
  });
});
