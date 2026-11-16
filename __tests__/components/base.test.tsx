import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Banner } from '@/components/Banner';
import { Boton } from '@/components/Boton';
import { Esqueleto, GrupoEsqueleto } from '@/components/Esqueleto';
import { EsqueletoDeLabores, EsqueletoDeLotes, EsqueletoDeTarjeta } from '@/components/esqueletos';
import { Insignia } from '@/components/Insignia';
import { Selector } from '@/components/Selector';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { Vista } from '@/components/Vista';

const vacio = { titulo: 'Aún no hay lotes', mensaje: 'Registra tu primer lote.' };

describe('Boton: variantes del rediseño (D104)', () => {
  it('tonal: fondo suave y el texto en `text` (el verde queda para el icono)', async () => {
    await render(<Boton titulo="Sincronizar" variante="tonal" onPress={jest.fn()} />);

    expect(screen.getByRole('button').props.className).toContain('bg-primary-soft');
    expect(screen.getByText('Sincronizar').props.className).toMatch(/text-text(\s|$)/);
    expect(screen.getByText('Sincronizar').props.className).not.toContain('text-primary');
  });

  it('peligroSuave: fondo rojo suave y texto rojo', async () => {
    await render(<Boton titulo="Borrar" variante="peligroSuave" onPress={jest.fn()} />);

    expect(screen.getByRole('button').props.className).toContain('bg-danger-soft');
    expect(screen.getByText('Borrar').props.className).toContain('text-danger');
  });
});

describe('Insignia: un color, un significado', () => {
  it.each([
    ['dorado', 'text-on-accent'],
    ['neutro', 'text-text-muted'],
    ['peligro', 'text-danger'],
    ['marca', 'text-text'],
  ] as const)('el tono %s usa el color de texto que cumple el contraste', async (tono, clase) => {
    await render(<Insignia tono={tono}>Etiqueta</Insignia>);

    expect(screen.getByText('Etiqueta').props.className).toContain(clase);
  });

  it('puede llevar un icono además del texto', async () => {
    await render(
      <Insignia tono="peligro" icono="alert-circle-outline">
        Hace 2 días
      </Insignia>,
    );

    expect(screen.getByText('Hace 2 días')).toBeTruthy();
  });
});

describe('Tarjeta: tono', () => {
  it('el tono peligro usa el fondo rojo suave y el borde del divisor en el normal', async () => {
    await render(
      <>
        <Tarjeta tono="peligro">
          <Texto>Vencida</Texto>
        </Tarjeta>
        <Tarjeta>
          <Texto>Normal</Texto>
        </Tarjeta>
      </>,
    );

    expect(screen.getByText('Vencida').parent?.props.className).toContain('bg-danger-soft');
    expect(screen.getByText('Normal').parent?.props.className).toContain('border-divider');
  });
});

describe('Banner', () => {
  it('el aviso se anuncia como alerta y no bloquea: lleva título y texto', async () => {
    await render(<Banner tono="aviso" icono="warning-outline" titulo="Carencia" texto="Espera" />);

    const alerta = screen.getByRole('alert');
    expect(alerta.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('Carencia')).toBeTruthy();
    expect(screen.getByText('Espera')).toBeTruthy();
  });

  it('la información no es una alerta pero sí una región viva', async () => {
    await render(<Banner icono="cloud-upload-outline" texto="2 cambios sin enviar" />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('2 cambios sin enviar')).toBeTruthy();
  });

  it('la acción es un botón aparte que responde', async () => {
    const alPulsar = jest.fn();
    await render(
      <Banner
        icono="cloud-upload-outline"
        texto="Pendiente"
        accion={{ titulo: 'Ver', alPulsar }}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Ver' }));

    expect(alPulsar).toHaveBeenCalledTimes(1);
  });
});

describe('Esqueleto', () => {
  it('el grupo se anuncia una sola vez como «Cargando»', async () => {
    await render(
      <GrupoEsqueleto>
        <Esqueleto className="h-5 w-40" />
        <Esqueleto className="h-5 w-20" />
      </GrupoEsqueleto>,
    );

    const progreso = screen.getByRole('progressbar', { name: 'Cargando' });
    expect(progreso.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
  });

  it.each([
    ['lotes', EsqueletoDeLotes],
    ['labores', EsqueletoDeLabores],
    ['tarjeta', EsqueletoDeTarjeta],
  ] as const)('el esqueleto de %s es un único elemento accesible', async (_nombre, Componente) => {
    await render(<Componente />);

    expect(screen.getAllByRole('progressbar', { name: 'Cargando' })).toHaveLength(1);
  });

  it('Vista usa el esqueleto en lugar del indicador genérico mientras carga', async () => {
    await render(
      <Vista
        carga={{ vista: { estado: 'cargando' }, reintentar: jest.fn() }}
        vacio={vacio}
        esqueleto={<EsqueletoDeLotes />}
      >
        {() => <Text>datos</Text>}
      </Vista>,
    );

    expect(screen.getByRole('progressbar', { name: 'Cargando' })).toBeTruthy();
    expect(screen.queryByText('Cargando…')).toBeNull();
    expect(screen.queryByText('datos')).toBeNull();
  });
});

describe('Selector: lo elegido', () => {
  it('se distingue por fondo suave, borde y marca; el texto sigue en `text`', async () => {
    await render(
      <Selector
        etiqueta="Tipo"
        opciones={[
          { valor: 'riego', etiqueta: 'Riego' },
          { valor: 'poda', etiqueta: 'Poda' },
        ]}
        valor="riego"
        onChange={jest.fn()}
      />,
    );

    const elegida = screen.getByRole('radio', { name: 'Riego' });
    expect(elegida.props.className).toContain('bg-primary-soft');
    expect(elegida.props.className).toContain('border-primary');
    expect(elegida.props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole('radio', { name: 'Poda' }).props.className).toContain('bg-surface');
  });
});
