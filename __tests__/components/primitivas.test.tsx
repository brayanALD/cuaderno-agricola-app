import { fireEvent, render, screen } from '@testing-library/react-native';
import { Boton } from '@/components/Boton';
import { BotonIcono } from '@/components/BotonIcono';
import { Insignia } from '@/components/Insignia';
import { Tarjeta } from '@/components/Tarjeta';
import { Texto } from '@/components/Texto';
import { unir } from '@/components/unir';

describe('unir', () => {
  it('junta las clases y descarta lo que no es texto', () => {
    expect(unir('a', undefined, false, 'b', '')).toBe('a b');
  });
});

describe('Texto', () => {
  it('el título es un encabezado para el lector de pantalla', async () => {
    await render(<Texto variante="titulo">Mis lotes</Texto>);

    expect(screen.getByRole('header', { name: 'Mis lotes' })).toBeTruthy();
  });

  it('usa el color por defecto de su variante y permite cambiarlo con `tono`', async () => {
    await render(
      <>
        <Texto variante="error">Falta el nombre</Texto>
        <Texto variante="cuerpo" tono="sobrePrimario">
          Sobre verde
        </Texto>
      </>,
    );

    expect(screen.getByText('Falta el nombre').props.className).toContain('text-danger');
    expect(screen.getByText('Sobre verde').props.className).toContain('text-on-primary');
    expect(screen.getByText('Sobre verde').props.className).not.toContain('text-text ');
  });

  it('añade las clases del llamador al final', async () => {
    await render(<Texto className="mt-2">Hola</Texto>);

    expect(screen.getByText('Hola').props.className).toMatch(/mt-2$/);
  });
});

describe('Boton', () => {
  it('es un botón con el título como nombre y llama a onPress', async () => {
    const alPulsar = jest.fn();
    await render(<Boton titulo="Guardar" onPress={alPulsar} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(alPulsar).toHaveBeenCalledTimes(1);
  });

  it('mide al menos 48 dp de alto y tiene borde para mostrar el foco', async () => {
    await render(<Boton titulo="Guardar" onPress={jest.fn()} />);

    const clases: string = screen.getByRole('button').props.className;
    expect(clases).toContain('min-h-[48px]');
    expect(clases).toContain('focus:border-focus');
  });

  it('deshabilitado no responde y lo informa como deshabilitado', async () => {
    const alPulsar = jest.fn();
    await render(<Boton titulo="Guardar" onPress={alPulsar} deshabilitado />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(alPulsar).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Guardar' }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('cargando muestra progreso, no responde y conserva su nombre accesible', async () => {
    const alPulsar = jest.fn();
    await render(<Boton titulo="Guardar" onPress={alPulsar} cargando />);

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar' }));

    expect(alPulsar).not.toHaveBeenCalled();
    expect(screen.getByTestId('indicador-de-carga')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar' }).props.accessibilityState).toMatchObject({
      busy: true,
    });
  });

  it('acepta una etiqueta accesible distinta del texto visible', async () => {
    await render(<Boton titulo="+" etiqueta="Aumentar cantidad" onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Aumentar cantidad' })).toBeTruthy();
  });

  it.each([
    ['primario', 'bg-primary'],
    ['secundario', 'border-primary'],
    ['peligro', 'bg-danger'],
    ['texto', 'bg-transparent'],
  ] as const)('la variante %s usa su clase de token', async (variante, clase) => {
    await render(<Boton titulo="X" variante={variante} onPress={jest.fn()} />);

    expect(screen.getByRole('button').props.className).toContain(clase);
  });
});

describe('BotonIcono', () => {
  it('exige una etiqueta, mide 48 × 48 dp y llama a onPress', async () => {
    const alPulsar = jest.fn();
    await render(<BotonIcono icono="trash-outline" etiqueta="Borrar lote" onPress={alPulsar} />);

    const boton = screen.getByRole('button', { name: 'Borrar lote' });
    await fireEvent.press(boton);

    expect(alPulsar).toHaveBeenCalledTimes(1);
    expect(boton.props.className).toContain('min-h-[48px]');
    expect(boton.props.className).toContain('min-w-[48px]');
  });

  it('deshabilitado no responde', async () => {
    const alPulsar = jest.fn();
    await render(
      <BotonIcono icono="trash-outline" etiqueta="Borrar lote" onPress={alPulsar} deshabilitado />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Borrar lote' }));

    expect(alPulsar).not.toHaveBeenCalled();
  });
});

describe('Insignia y Tarjeta', () => {
  it('la insignia muestra su texto con colores de acento', async () => {
    await render(<Insignia>90 días</Insignia>);

    expect(screen.getByText('90 días').props.className).toContain('text-on-accent');
  });

  it('la tarjeta contiene a sus hijos', async () => {
    await render(
      <Tarjeta>
        <Texto>Dentro</Texto>
      </Tarjeta>,
    );

    expect(screen.getByText('Dentro')).toBeTruthy();
  });
});
