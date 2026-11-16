import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FormularioLote } from '@/components/formularios/FormularioLote';
import { fallo, exito } from '@/services/resultado';
import { valoresDesdeLote, valoresLoteVacios } from '@/services/formularios';
import { loteFila } from '../helpers/filas';

jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  hasServicesEnabledAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('expo-sensors', () => ({
  Barometer: { isAvailableAsync: jest.fn(), setUpdateInterval: jest.fn(), addListener: jest.fn() },
}));

const Location = jest.requireMock<{
  hasServicesEnabledAsync: jest.Mock;
  requestForegroundPermissionsAsync: jest.Mock;
  getCurrentPositionAsync: jest.Mock;
}>('expo-location');
const { Barometer } = jest.requireMock<{ Barometer: { isAvailableAsync: jest.Mock } }>(
  'expo-sensors',
);

const HOY = '2026-11-14';

beforeEach(() => {
  Location.hasServicesEnabledAsync.mockReset().mockResolvedValue(true);
  Location.requestForegroundPermissionsAsync.mockReset().mockResolvedValue({ status: 'granted' });
  Location.getCurrentPositionAsync.mockReset().mockResolvedValue({
    coords: { latitude: 4.65, longitude: -75.57, altitude: 1650, accuracy: 10 },
  });
  Barometer.isAvailableAsync.mockReset().mockResolvedValue(false);
});

async function montar(cambios: Partial<Parameters<typeof FormularioLote>[0]> = {}) {
  const props = {
    valoresIniciales: valoresLoteVacios(HOY),
    hoy: HOY,
    textoBoton: 'Crear lote',
    alGuardar: jest.fn().mockResolvedValue(exito(null)),
    alTerminar: jest.fn(),
    ...cambios,
  };
  const resultado = await render(<FormularioLote {...props} />);
  return { props, ...resultado };
}

async function escribir(etiqueta: string, texto: string) {
  await fireEvent.changeText(screen.getByLabelText(etiqueta), texto);
}

async function llenarLoteValido() {
  await escribir('Nombre del lote', 'La Loma');
  await escribir('Cultivo', 'Aguacate');
  await escribir('Área (m²)', '2500');
}

const guardar = () => fireEvent.press(screen.getByRole('button', { name: 'Crear lote' }));

describe('FormularioLote: validación', () => {
  it('vacío: muestra los errores en español junto a cada campo y no guarda', async () => {
    const { props } = await montar();
    await screen.findByText('Nombre del lote');

    await guardar();

    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(2);
    expect(screen.getByText('Escribe un número.')).toBeTruthy();
    expect(props.alGuardar).not.toHaveBeenCalled();
    expect(props.alTerminar).not.toHaveBeenCalled();
  });

  it('un área con decimales o una altitud fuera de rango se rechazan al guardar', async () => {
    const { props } = await montar();
    await llenarLoteValido();
    await escribir('Área (m²)', '10,5');
    await escribir('Altitud (m)', '7000');

    await guardar();

    expect(await screen.findByText('El área debe ser un número entero de m².')).toBeTruthy();
    expect(screen.getByText('La altitud máxima es 6000 m.')).toBeTruthy();
    expect(props.alGuardar).not.toHaveBeenCalled();
  });

  it('el botón no está deshabilitado: el error se explica, no se oculta el botón', async () => {
    await montar();

    expect(
      screen.getByRole('button', { name: 'Crear lote' }).props.accessibilityState,
    ).toMatchObject({
      disabled: false,
    });
  });
});

describe('FormularioLote: guardado', () => {
  it('con datos válidos entrega los valores ya convertidos y termina', async () => {
    const { props } = await montar();
    await llenarLoteValido();
    await escribir('Altitud (m)', '1650,5');

    await guardar();

    await waitFor(() => expect(props.alTerminar).toHaveBeenCalledTimes(1));
    expect(props.alGuardar).toHaveBeenCalledWith({
      nombre: 'La Loma',
      cultivo: 'Aguacate',
      area_m2: 2500,
      altitud_m: 1650.5,
      lat: null,
      lng: null,
      fecha_siembra: HOY,
      finca: null,
    });
  });

  it('un error del servicio (nombre repetido) aparece bajo su campo y no termina', async () => {
    const alGuardar = jest
      .fn()
      .mockResolvedValue(fallo({ nombre: 'Ya existe un lote con ese nombre.' }));
    const { props } = await montar({ alGuardar });
    await llenarLoteValido();

    await guardar();

    expect(await screen.findByText('Ya existe un lote con ese nombre.')).toBeTruthy();
    // El error es del campo «nombre»: el campo queda marcado, no es un mensaje general suelto.
    expect(screen.getByLabelText('Nombre del lote').props.className).toContain('border-danger');
    expect(screen.getByLabelText('Cultivo').props.className).not.toContain('border-danger');
    expect(props.alTerminar).not.toHaveBeenCalled();
  });

  it('un error general del servicio se muestra arriba del botón y no marca ningún campo', async () => {
    const alGuardar = jest.fn().mockResolvedValue(fallo({ general: 'El lote no existe.' }));
    await montar({ alGuardar });
    await llenarLoteValido();

    await guardar();

    expect(await screen.findByText('El lote no existe.')).toBeTruthy();
    expect(screen.getByLabelText('Nombre del lote').props.className).not.toContain('border-danger');
  });

  it('editar: arranca con los valores del lote y usa el texto del botón recibido', async () => {
    await montar({
      valoresIniciales: valoresDesdeLote(loteFila({ nombre: 'El Mirador', area_m2: 7000 })),
      textoBoton: 'Guardar cambios',
    });

    expect(screen.getByLabelText('Nombre del lote').props.value).toBe('El Mirador');
    expect(screen.getByLabelText('Área (m²)').props.value).toBe('7000');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
  });
});

describe('FormularioLote: ubicación y altitud (RF-02, criterio 3)', () => {
  it('«Usar mi ubicación» rellena coordenadas y altitud, con aviso de menor precisión sin barómetro', async () => {
    await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Usar mi ubicación' }));

    await waitFor(() => expect(screen.getByLabelText('Latitud').props.value).toBe('4.65'));
    expect(screen.getByLabelText('Longitud').props.value).toBe('-75.57');
    expect(screen.getByLabelText('Altitud (m)').props.value).toBe('1650');
    expect(await screen.findByText(/menor precisión/)).toBeTruthy();
  });

  it('los campos siguen editables después de medir (alternativa manual)', async () => {
    const { props } = await montar();
    await fireEvent.press(screen.getByRole('button', { name: 'Usar mi ubicación' }));
    await waitFor(() => expect(screen.getByLabelText('Altitud (m)').props.value).toBe('1650'));
    await llenarLoteValido();
    await escribir('Altitud (m)', '1700');

    await guardar();

    await waitFor(() => expect(props.alGuardar).toHaveBeenCalled());
    expect(props.alGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 4.65, lng: -75.57, altitud_m: 1700 }),
    );
  });

  it('permiso denegado: explica la alternativa y se puede escribir a mano', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });
    const { props } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Usar mi ubicación' }));

    expect(await screen.findByText(/a mano/)).toBeTruthy();
    await llenarLoteValido();
    await escribir('Latitud', '4,5');
    await escribir('Longitud', '-75,5');
    await guardar();

    await waitFor(() => expect(props.alGuardar).toHaveBeenCalled());
    expect(props.alGuardar).toHaveBeenCalledWith(expect.objectContaining({ lat: 4.5, lng: -75.5 }));
  });

  it('sin altitud GPS ni barómetro, la altitud queda para escribirla', async () => {
    Location.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 4.65, longitude: -75.57, altitude: null, accuracy: 10 },
    });
    await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Usar mi ubicación' }));

    expect(await screen.findByText(/escríbela a mano/)).toBeTruthy();
    expect(screen.getByLabelText('Altitud (m)').props.value).toBe('');
  });
});
