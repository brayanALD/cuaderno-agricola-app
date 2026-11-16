import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FormularioLabor } from '@/components/formularios/FormularioLabor';
import { valoresDesdeLabor, valoresLaborVacios } from '@/services/formularios';
import { exito, fallo } from '@/services/resultado';
import { crearContextoDePrueba } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { laborFila } from '../helpers/filas';

jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const { launchImageLibraryAsync } = jest.requireMock<{ launchImageLibraryAsync: jest.Mock }>(
  'expo-image-picker',
);

const HOY = '2026-11-14';
const Raiz = ({ children }: { children: ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
);

beforeEach(() => {
  launchImageLibraryAsync.mockReset();
});

async function montar(cambios: Partial<Parameters<typeof FormularioLabor>[0]> = {}) {
  const props = {
    fechaSiembra: '2026-08-16',
    valoresIniciales: valoresLaborVacios(HOY),
    hoy: HOY,
    textoBoton: 'Registrar labor',
    alGuardar: jest.fn().mockResolvedValue(exito(null)),
    alTerminar: jest.fn(),
    ...cambios,
  };
  const Envoltorio = crearEnvoltorio(await crearContextoDePrueba());
  const Completo = ({ children }: { children: ReactNode }) => (
    <Raiz>
      <Envoltorio>{children}</Envoltorio>
    </Raiz>
  );
  const resultado = await render(<FormularioLabor {...props} />, { wrapper: Completo });
  return { props, ...resultado };
}

const guardar = () => fireEvent.press(screen.getByRole('button', { name: 'Registrar labor' }));

async function elegirFechaEnCalendario(nombreDelDia: string, meses = 0) {
  await fireEvent.press(screen.getByRole('radio', { name: 'Otra fecha' }));
  for (let i = 0; i < meses; i++) {
    await fireEvent.press(screen.getByRole('button', { name: 'Mes anterior' }));
  }
  await fireEvent.press(screen.getByRole('button', { name: nombreDelDia }));
}

describe('FormularioLabor', () => {
  it('arranca en riego, de hoy, con la unidad sugerida y sin luz ni foto', async () => {
    await montar();

    expect(screen.getByRole('radio', { name: 'Riego' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByText('14 de noviembre de 2026')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Hoy' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByRole('button', { name: 'Unidad: L. Cambiar' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Quitar foto' })).toBeNull();
  });

  it('cambiar el tipo sugiere su unidad; en cosecha la unidad es siempre kg y se oculta el campo', async () => {
    await montar();

    await fireEvent.press(screen.getByRole('radio', { name: 'Abono' }));
    expect(screen.getByRole('button', { name: 'Unidad: kg. Cambiar' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Cosecha' }));
    expect(screen.queryByRole('button', { name: /^Unidad:/ })).toBeNull();
    expect(screen.getByText('kg')).toBeTruthy();
  });

  it('guarda con los valores elegidos (cantidad por botones, nota y luz)', async () => {
    const { props } = await montar();
    for (let i = 0; i < 3; i++) {
      await fireEvent.press(screen.getByRole('button', { name: 'Aumentar cantidad' }));
    }
    await fireEvent.changeText(screen.getByLabelText('Nota (opcional)'), '  Goteo  ');
    await fireEvent.press(screen.getByRole('button', { name: /^Más detalles/ }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Soleado' }));

    await guardar();

    await waitFor(() => expect(props.alTerminar).toHaveBeenCalledTimes(1));
    expect(props.alGuardar).toHaveBeenCalledWith({
      tipo: 'riego',
      fecha: HOY,
      cantidad: 3,
      unidad: 'L',
      nota: 'Goteo',
      luz: 'soleado',
      foto_uri: null,
      producto: null,
      carencia_dias: null,
      costo: null,
    });
  });

  it('una cosecha se guarda con paso de 0,5 kg', async () => {
    const { props } = await montar();
    await fireEvent.press(screen.getByRole('radio', { name: 'Cosecha' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aumentar cantidad' }));

    await guardar();

    await waitFor(() => expect(props.alGuardar).toHaveBeenCalled());
    expect(props.alGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'cosecha', cantidad: 0.5 }),
    );
  });

  it('una labor realizada no puede tener fecha futura', async () => {
    const { props } = await montar();

    await fireEvent.press(screen.getByRole('radio', { name: 'Otra fecha' }));
    const futuro = screen.getByRole('button', { name: '20 de noviembre de 2026' });
    expect(futuro.props.accessibilityState).toMatchObject({ disabled: true });
    await fireEvent.press(futuro);
    await guardar();

    expect(props.alGuardar).toHaveBeenCalledWith(expect.objectContaining({ fecha: HOY }));
  });

  it('la cosecha no puede ser anterior a la siembra', async () => {
    const { props } = await montar();
    await fireEvent.press(screen.getByRole('radio', { name: 'Cosecha' }));

    await elegirFechaEnCalendario('1 de agosto de 2026', 3);
    await guardar();

    expect(await screen.findByText('La cosecha no puede ser anterior a la siembra.')).toBeTruthy();
    expect(props.alGuardar).not.toHaveBeenCalled();
  });

  it('foto: elegir de la galería muestra la vista previa y se guarda; se puede quitar', async () => {
    launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///galeria/riego.jpg' }],
    });
    const { props } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Elegir de la galería' }));
    expect(await screen.findByLabelText('Vista previa de la foto elegida')).toBeTruthy();

    await guardar();
    await waitFor(() => expect(props.alGuardar).toHaveBeenCalled());
    expect(props.alGuardar).toHaveBeenCalledWith(
      expect.objectContaining({ foto_uri: 'file:///permanente/id-1.jpg' }),
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Quitar foto' }));
    expect(screen.queryByLabelText('Vista previa de la foto elegida')).toBeNull();
  });

  it('si se cancela la galería, no cambia nada', async () => {
    launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
    await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Elegir de la galería' }));

    expect(screen.queryByLabelText('Vista previa de la foto elegida')).toBeNull();
  });

  it('si la galería falla, avisa sin romper el formulario', async () => {
    launchImageLibraryAsync.mockRejectedValue(new Error('Sin acceso'));
    await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Elegir de la galería' }));

    expect(await screen.findByText('No se pudo abrir la galería. Intenta de nuevo.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Registrar labor' })).toBeTruthy();
  });

  it('errores del servicio: en su campo o como mensaje general', async () => {
    const alGuardar = jest
      .fn()
      .mockResolvedValue(
        fallo({ cantidad: 'La cantidad no puede ser negativa.', general: 'El lote no existe.' }),
      );
    const { props } = await montar({ alGuardar });

    await guardar();

    expect(await screen.findByText('La cantidad no puede ser negativa.')).toBeTruthy();
    expect(screen.getByText('El lote no existe.')).toBeTruthy();
    expect(props.alTerminar).not.toHaveBeenCalled();
  });

  it('editar: arranca con los valores de la labor, incluida la foto', async () => {
    await montar({
      valoresIniciales: valoresDesdeLabor(
        laborFila({
          tipo: 'poda',
          cantidad: 4,
          unidad: 'ramas',
          nota: 'Bajas',
          foto_uri: 'file:///p.jpg',
        }),
      ),
      textoBoton: 'Guardar cambios',
    });

    expect(screen.getByRole('radio', { name: 'Poda' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByLabelText('Nota (opcional)').props.value).toBe('Bajas');
    expect(screen.getByLabelText('Vista previa de la foto elegida')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeTruthy();
  });

  it('«Hoy» y «Ayer» eligen la fecha en un toque, sin abrir el calendario', async () => {
    const { props } = await montar();

    await fireEvent.press(screen.getByRole('radio', { name: 'Ayer' }));
    expect(screen.getByText('13 de noviembre de 2026')).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'Hoy' }));
    expect(screen.getByText('14 de noviembre de 2026')).toBeTruthy();
    await guardar();

    await waitFor(() => expect(props.alGuardar).toHaveBeenCalled());
    expect(screen.queryByText('noviembre de 2026')).toBeNull();
    expect(props.alGuardar).toHaveBeenCalledWith(expect.objectContaining({ fecha: HOY }));
  });

  it('la unidad se cambia en una hoja: una común o una propia', async () => {
    const { props } = await montar();

    await fireEvent.press(screen.getByRole('button', { name: 'Unidad: L. Cambiar' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'mL' }));
    expect(screen.getByRole('button', { name: 'Unidad: mL. Cambiar' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Unidad: mL. Cambiar' }));
    await fireEvent.changeText(screen.getByLabelText('Otra unidad'), 'cubetas');
    await fireEvent.press(screen.getByRole('button', { name: 'Usar esta unidad' }));
    await guardar();

    await waitFor(() => expect(props.alGuardar).toHaveBeenCalled());
    expect(props.alGuardar).toHaveBeenCalledWith(expect.objectContaining({ unidad: 'cubetas' }));
  });

  it('«Más detalles» llega plegado y se abre solo al editar una labor que ya trae luz o costo', async () => {
    await montar();
    expect(screen.queryByRole('radio', { name: 'Soleado' })).toBeNull();
    expect(
      screen.getByRole('button', { name: /^Más detalles/ }).props.accessibilityState,
    ).toMatchObject({ expanded: false });
  });

  it('al editar una labor con luz, los detalles ya están abiertos', async () => {
    await montar({
      valoresIniciales: valoresDesdeLabor(laborFila({ luz: 'soleado', costo: 1000 })),
      textoBoton: 'Guardar cambios',
    });

    expect(screen.getByRole('radio', { name: 'Soleado' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
  });

  it('muestra en qué lote se trabaja', async () => {
    await montar({ lote: { nombre: 'La Esperanza', cultivo: 'Café' } });

    expect(screen.getByText('La Esperanza')).toBeTruthy();
    expect(screen.getByText('Café')).toBeTruthy();
  });
});
