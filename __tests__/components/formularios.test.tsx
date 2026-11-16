import { fireEvent, render, screen } from '@testing-library/react-native';
import { CampoFecha } from '@/components/CampoFecha';
import { CampoTexto } from '@/components/CampoTexto';
import { Selector } from '@/components/Selector';

beforeEach(() => {});

describe('CampoTexto', () => {
  it('tiene etiqueta visible, nombre accesible y avisa los cambios', async () => {
    const alCambiar = jest.fn();
    await render(<CampoTexto etiqueta="Nombre del lote" valor="" onChangeText={alCambiar} />);

    expect(screen.getByText('Nombre del lote')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Nombre del lote'), 'La Loma');

    expect(alCambiar).toHaveBeenCalledWith('La Loma');
  });

  it('la ayuda es la pista de accesibilidad y también se ve', async () => {
    await render(
      <CampoTexto etiqueta="Área (m²)" valor="" onChangeText={jest.fn()} ayuda="Mayor que 0" />,
    );

    expect(screen.getByText('Mayor que 0')).toBeTruthy();
    expect(screen.getByLabelText('Área (m²)').props.accessibilityHint).toBe('Mayor que 0');
  });

  it('el error se anuncia (región viva) y no depende solo del color', async () => {
    await render(
      <CampoTexto
        etiqueta="Nombre"
        valor=""
        onChangeText={jest.fn()}
        error="Este campo es obligatorio."
      />,
    );

    const mensaje = screen.getByText('Este campo es obligatorio.');
    expect(mensaje.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByLabelText('Nombre').props.className).toContain('border-danger');
  });

  it('sin error no hay alerta y el borde es el de control', async () => {
    await render(<CampoTexto etiqueta="Nombre" valor="x" onChangeText={jest.fn()} />);

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Nombre').props.className).toContain('border-border');
  });

  it('mide al menos 48 dp de alto', async () => {
    await render(<CampoTexto etiqueta="Nombre" valor="" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Nombre').props.className).toContain('min-h-[48px]');
  });

  it('pasa el tipo de teclado y avisa al perder el foco', async () => {
    const alSalir = jest.fn();
    await render(
      <CampoTexto
        etiqueta="Área"
        valor=""
        onChangeText={jest.fn()}
        teclado="numeric"
        onBlur={alSalir}
      />,
    );

    expect(screen.getByLabelText('Área').props.keyboardType).toBe('numeric');
    await fireEvent(screen.getByLabelText('Área'), 'blur');
    expect(alSalir).toHaveBeenCalledTimes(1);
  });
});

describe('Selector', () => {
  const opciones = [
    { valor: 'soleado', etiqueta: 'Soleado' },
    { valor: 'nublado', etiqueta: 'Nublado' },
  ] as const;

  it('es un grupo de opciones; la elegida figura como marcada', async () => {
    await render(
      <Selector etiqueta="Luz" opciones={opciones} valor="nublado" onChange={jest.fn()} />,
    );

    // El grupo no es `accessible`: así TalkBack puede enfocar cada opción por separado.
    const grupo = screen.getByLabelText('Luz');
    expect(grupo.props.accessibilityRole).toBe('radiogroup');
    expect(grupo.props.accessible).not.toBe(true);
    expect(screen.getByRole('radio', { name: 'Nublado' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByRole('radio', { name: 'Soleado' }).props.accessibilityState).toMatchObject({
      checked: false,
    });
  });

  it('al pulsar una opción avisa su valor', async () => {
    const alCambiar = jest.fn();
    await render(<Selector etiqueta="Luz" opciones={opciones} valor={null} onChange={alCambiar} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Soleado' }));

    expect(alCambiar).toHaveBeenCalledWith('soleado');
  });

  it('con `permitirVacio`, pulsar la opción marcada la desmarca (null)', async () => {
    const alCambiar = jest.fn();
    await render(
      <Selector
        etiqueta="Luz"
        opciones={opciones}
        valor="soleado"
        onChange={alCambiar}
        permitirVacio
      />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Soleado' }));

    expect(alCambiar).toHaveBeenCalledWith(null);
  });

  it('sin `permitirVacio`, pulsar la marcada no cambia nada', async () => {
    const alCambiar = jest.fn();
    await render(
      <Selector etiqueta="Luz" opciones={opciones} valor="soleado" onChange={alCambiar} />,
    );

    await fireEvent.press(screen.getByRole('radio', { name: 'Soleado' }));

    expect(alCambiar).not.toHaveBeenCalled();
  });

  it('cada opción mide al menos 48 dp', async () => {
    await render(<Selector etiqueta="Luz" opciones={opciones} valor={null} onChange={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Soleado' }).props.className).toContain(
      'min-h-[48px]',
    );
  });

  it('muestra el error del selector', async () => {
    await render(
      <Selector
        etiqueta="Tipo"
        opciones={opciones}
        valor={null}
        onChange={jest.fn()}
        error="Elige un tipo."
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Elige un tipo.')).toBeTruthy();
  });
});

describe('CampoFecha', () => {
  it('muestra la fecha escrita en español y un botón que abre el calendario propio en ese mes', async () => {
    await render(
      <CampoFecha
        etiqueta="Fecha de siembra"
        valor="2026-08-16"
        onChange={jest.fn()}
        hoy="2026-11-14"
      />,
    );

    expect(screen.getByText('16 de agosto de 2026')).toBeTruthy();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Fecha de siembra: 16 de agosto de 2026. Cambiar' }),
    );

    expect(screen.getByText('agosto de 2026')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: '16 de agosto de 2026' }).props.accessibilityState,
    ).toMatchObject({ selected: true });
  });

  it('al tocar un día avisa en formato AAAA-MM-DD y cierra el calendario', async () => {
    const alCambiar = jest.fn();
    await render(
      <CampoFecha etiqueta="Fecha" valor="2026-08-16" onChange={alCambiar} hoy="2026-11-14" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: /Cambiar/ }));

    await fireEvent.press(screen.getByRole('button', { name: '1 de agosto de 2026' }));

    expect(alCambiar).toHaveBeenCalledWith('2026-08-01');
    expect(screen.queryByText('agosto de 2026')).toBeNull();
  });

  it('se puede cambiar de mes con las flechas', async () => {
    const alCambiar = jest.fn();
    await render(
      <CampoFecha etiqueta="Fecha" valor="2026-08-16" onChange={alCambiar} hoy="2026-11-14" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: /Cambiar/ }));

    await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
    expect(screen.getByText('julio de 2026')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Mes siguiente' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Mes siguiente' }));
    await fireEvent.press(screen.getByRole('button', { name: '30 de septiembre de 2026' }));

    expect(alCambiar).toHaveBeenCalledWith('2026-09-30');
  });

  it('si se cierra el calendario sin elegir, no cambia nada', async () => {
    const alCambiar = jest.fn();
    await render(
      <CampoFecha etiqueta="Fecha" valor="2026-08-16" onChange={alCambiar} hoy="2026-11-14" />,
    );
    await fireEvent.press(screen.getByRole('button', { name: /Cambiar/ }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(alCambiar).not.toHaveBeenCalled();
    expect(screen.queryByText('agosto de 2026')).toBeNull();
  });

  it('el botón «Hoy» pone la fecha de hoy', async () => {
    const alCambiar = jest.fn();
    await render(
      <CampoFecha etiqueta="Fecha" valor="2026-08-16" onChange={alCambiar} hoy="2026-11-14" />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Usar la fecha de hoy' }));

    expect(alCambiar).toHaveBeenCalledWith('2026-11-14');
  });

  it('`maxima` bloquea los días siguientes y el mes siguiente (las labores realizadas no pueden ser futuras)', async () => {
    const alCambiar = jest.fn();
    await render(
      <CampoFecha
        etiqueta="Fecha"
        valor="2026-11-01"
        onChange={alCambiar}
        hoy="2026-11-14"
        maxima="2026-11-14"
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: /Cambiar/ }));

    expect(
      screen.getByRole('button', { name: '15 de noviembre de 2026' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
    await fireEvent.press(screen.getByRole('button', { name: '15 de noviembre de 2026' }));
    expect(alCambiar).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Mes siguiente' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });

  it('un valor vacío o inválido se muestra como «Sin fecha» y abre el calendario en el mes de hoy', async () => {
    await render(<CampoFecha etiqueta="Fecha" valor="" onChange={jest.fn()} hoy="2026-11-14" />);

    expect(screen.getByText('Sin fecha')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: /Cambiar/ }));

    expect(screen.getByText('noviembre de 2026')).toBeTruthy();
  });

  it('muestra el error', async () => {
    await render(
      <CampoFecha
        etiqueta="Fecha"
        valor="2026-11-20"
        onChange={jest.fn()}
        hoy="2026-11-14"
        error="No puede ser futura."
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('No puede ser futura.')).toBeTruthy();
  });
});
