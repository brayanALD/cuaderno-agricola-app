import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Vista } from '@/components/Vista';
import type { Carga } from '@/hooks/useCarga';

const vacio = { titulo: 'Aún no hay lotes', mensaje: 'Registra tu primer lote.' };

function carga<T>(vista: Carga<T>['vista'], reintentar = jest.fn()): Carga<T> {
  return { vista, reintentar };
}

describe('Vista', () => {
  it('cargando: muestra progreso y lo anuncia', async () => {
    await render(
      <Vista carga={carga({ estado: 'cargando' })} vacio={vacio}>
        {() => <Text>datos</Text>}
      </Vista>,
    );

    const progreso = screen.getByRole('progressbar', { name: 'Cargando' });
    expect(progreso.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Cargando…')).toBeTruthy();
    expect(screen.queryByText('datos')).toBeNull();
  });

  it('vacío: explica qué falta y no muestra los datos', async () => {
    await render(
      <Vista carga={carga({ estado: 'vacio' })} vacio={vacio}>
        {() => <Text>datos</Text>}
      </Vista>,
    );

    expect(screen.getByText('Aún no hay lotes')).toBeTruthy();
    expect(screen.getByText('Registra tu primer lote.')).toBeTruthy();
    expect(screen.queryByText('datos')).toBeNull();
  });

  it('vacío con acción: ofrece el botón', async () => {
    const alPulsar = jest.fn();
    await render(
      <Vista
        carga={carga({ estado: 'vacio' })}
        vacio={{ ...vacio, accion: { titulo: 'Nuevo lote', alPulsar } }}
      >
        {() => <Text>datos</Text>}
      </Vista>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Nuevo lote' }));

    expect(alPulsar).toHaveBeenCalledTimes(1);
  });

  it('error: muestra el mensaje con alerta y un botón para reintentar', async () => {
    const reintentar = jest.fn();
    await render(
      <Vista
        carga={carga({ estado: 'error', error: new Error('Base cerrada') }, reintentar)}
        vacio={vacio}
      >
        {() => <Text>datos</Text>}
      </Vista>,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Base cerrada')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reintentar' }));

    expect(reintentar).toHaveBeenCalledTimes(1);
  });

  it('listo: entrega los datos a quien dibuja', async () => {
    await render(
      <Vista carga={carga({ estado: 'listo', datos: ['Uno', 'Dos'] })} vacio={vacio}>
        {(nombres) => <Text>{nombres.join(' y ')}</Text>}
      </Vista>,
    );

    expect(screen.getByText('Uno y Dos')).toBeTruthy();
  });
});
