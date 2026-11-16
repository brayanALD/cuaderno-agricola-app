import { fireEvent, render, screen } from '@testing-library/react-native';
import { PanelSincronizacion } from '@/components/PanelSincronizacion';
import type { SincronizacionValor } from '@/context/SincronizacionContext';
import { formatearFechaHora } from '@/services/fechas';

const ULTIMA = new Date(2026, 10, 15, 9, 5).toISOString();

const estado = (cambios: Partial<SincronizacionValor> = {}): SincronizacionValor => ({
  sincronizando: false,
  resultado: null,
  ultimaVez: null,
  pendientes: 0,
  conAviso: 0,
  enLinea: true,
  sincronizarAhora: jest.fn().mockResolvedValue(undefined),
  ...cambios,
});

describe('PanelSincronizacion', () => {
  it('antes de la primera vez lo dice', async () => {
    await render(<PanelSincronizacion sync={estado()} />);

    expect(screen.getByText('Aún no se ha sincronizado.')).toBeTruthy();
    expect(screen.getByText('Todo está sincronizado.')).toBeTruthy();
  });

  it('muestra cuándo fue la última sincronización, en palabras', async () => {
    await render(<PanelSincronizacion sync={estado({ ultimaVez: ULTIMA })} />);

    expect(screen.getByText(`Última sincronización: ${formatearFechaHora(ULTIMA)}`)).toBeTruthy();
  });

  it.each([
    [1, '1 cambio por enviar.'],
    [3, '3 cambios por enviar.'],
  ])('con %i pendientes dice «%s»', async (pendientes, texto) => {
    await render(<PanelSincronizacion sync={estado({ pendientes })} />);

    expect(screen.getByText(texto)).toBeTruthy();
    expect(screen.queryByText('Todo está sincronizado.')).toBeNull();
  });

  it('sin conexión lo avisa', async () => {
    await render(<PanelSincronizacion sync={estado({ enLinea: false })} />);

    expect(screen.getByText('Sin conexión a internet.')).toBeTruthy();
  });

  it('con avisos (lotes o labores que el servidor rechazó) explica cómo arreglarlos', async () => {
    await render(<PanelSincronizacion sync={estado({ conAviso: 2, pendientes: 2 })} />);

    expect(
      screen.getByText(
        '2 elementos no se pudieron enviar. Ábrelos, corrígelos y se enviarán solos.',
      ),
    ).toBeTruthy();
  });

  it('con un solo aviso usa el singular', async () => {
    await render(<PanelSincronizacion sync={estado({ conAviso: 1, pendientes: 1 })} />);

    expect(
      screen.getByText('1 elemento no se pudo enviar. Ábrelo, corrígelo y se enviará solo.'),
    ).toBeTruthy();
  });

  it('si la última vuelta falló muestra el motivo como alerta', async () => {
    await render(
      <PanelSincronizacion
        sync={estado({
          resultado: {
            ok: false,
            motivo: 'sin-conexion',
            mensaje: 'Sin conexión: tus cambios se enviarán cuando vuelva.',
          },
        })}
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Sin conexión: tus cambios se enviarán cuando vuelva.')).toBeTruthy();
  });

  it('mientras sincroniza lo dice y el botón queda ocupado', async () => {
    await render(<PanelSincronizacion sync={estado({ sincronizando: true })} />);

    expect(screen.getByText('Sincronizando…')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Sincronizar ahora', busy: true, disabled: true }),
    ).toBeTruthy();
  });

  it('el botón «Sincronizar ahora» lanza la sincronización', async () => {
    const sync = estado();
    await render(<PanelSincronizacion sync={sync} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Sincronizar ahora' }));

    expect(sync.sincronizarAhora).toHaveBeenCalledTimes(1);
  });
});
