import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Appearance } from 'react-native';
import { PanelApariencia } from '@/components/PanelApariencia';
import {
  aplicarApariencia,
  esApariencia,
  esquemaForzado,
  leerApariencia,
  type AlmacenDeApariencia,
} from '@/theme/apariencia';
import { AparienciaProvider } from '@/theme/AparienciaProvider';

function almacenEnMemoria(inicial: string | null = null) {
  let guardado = inicial;
  const almacen: AlmacenDeApariencia = {
    leer: () => Promise.resolve(guardado),
    guardar: (valor) => {
      guardado = valor;
      return Promise.resolve();
    },
  };
  return { almacen, guardado: () => guardado };
}

let aplicar: jest.SpyInstance;
beforeEach(() => {
  aplicar = jest.spyOn(Appearance, 'setColorScheme').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('apariencia: funciones puras', () => {
  it('«claro» y «oscuro» fuerzan su esquema y «sistema» deja el control al teléfono', () => {
    expect(esquemaForzado('claro')).toBe('light');
    expect(esquemaForzado('oscuro')).toBe('dark');
    expect(esquemaForzado('sistema')).toBeNull();
  });

  it('solo reconoce las tres opciones', () => {
    expect(esApariencia('oscuro')).toBe(true);
    expect(esApariencia('azul')).toBe(false);
    expect(esApariencia(null)).toBe(false);
  });

  it('aplicar «sistema» le devuelve el control al teléfono (auto) y las otras lo fijan', () => {
    aplicarApariencia('sistema');
    aplicarApariencia('oscuro');
    aplicarApariencia('claro');

    expect(aplicar.mock.calls.map(([esquema]) => esquema)).toEqual(['auto', 'dark', 'light']);
  });

  it.each([
    ['oscuro', 'oscuro'],
    ['claro', 'claro'],
    [null, 'sistema'],
    ['basura', 'sistema'],
  ])('lo guardado %p se lee como %s', async (guardado, esperado) => {
    expect(await leerApariencia(almacenEnMemoria(guardado).almacen)).toBe(esperado);
  });

  it('si el almacén falla, la app abre igual siguiendo al sistema', async () => {
    const roto: AlmacenDeApariencia = {
      leer: () => Promise.reject(new Error('Keystore')),
      guardar: () => Promise.resolve(),
    };

    expect(await leerApariencia(roto)).toBe('sistema');
  });
});

describe('AparienciaProvider y panel de Cuenta', () => {
  it('aplica lo guardado ANTES de pintar la app', async () => {
    const { almacen } = almacenEnMemoria('oscuro');
    await render(
      <AparienciaProvider almacen={almacen}>
        <PanelApariencia />
      </AparienciaProvider>,
    );

    expect(await screen.findByRole('radio', { name: 'Oscuro' })).toBeTruthy();
    expect(aplicar).toHaveBeenCalledWith('dark');
    expect(screen.getByRole('radio', { name: 'Oscuro' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('elegir una opción la aplica al instante y la guarda en el teléfono', async () => {
    const memoria = almacenEnMemoria();
    await render(
      <AparienciaProvider almacen={memoria.almacen}>
        <PanelApariencia />
      </AparienciaProvider>,
    );
    await screen.findByRole('radio', { name: 'Sistema' });

    await fireEvent.press(screen.getByRole('radio', { name: 'Claro' }));

    expect(aplicar).toHaveBeenLastCalledWith('light');
    expect(screen.getByRole('radio', { name: 'Claro' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    await waitFor(() => expect(memoria.guardado()).toBe('claro'));
  });

  it('por defecto sigue al sistema', async () => {
    await render(
      <AparienciaProvider almacen={almacenEnMemoria().almacen}>
        <PanelApariencia />
      </AparienciaProvider>,
    );

    expect(await screen.findByRole('radio', { name: 'Sistema' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Sistema' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('si guardar falla, el cambio sigue aplicado en esta sesión', async () => {
    const almacen: AlmacenDeApariencia = {
      leer: () => Promise.resolve(null),
      guardar: () => Promise.reject(new Error('lleno')),
    };
    await render(
      <AparienciaProvider almacen={almacen}>
        <PanelApariencia />
      </AparienciaProvider>,
    );
    await screen.findByRole('radio', { name: 'Sistema' });

    await act(async () => {
      fireEvent.press(screen.getByRole('radio', { name: 'Oscuro' }));
    });

    expect(aplicar).toHaveBeenLastCalledWith('dark');
  });
});
