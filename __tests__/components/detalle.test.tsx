import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Chip } from '@/components/Chip';
import { ConsejoDeGestos } from '@/components/ConsejoDeGestos';
import { MenuDeAcciones } from '@/components/MenuDeAcciones';
import { leerAjuste } from '@/repositories/ajusteRepository';
import { CONSEJO_GESTOS } from '@/services/ajustesService';
import { crearContextoDePrueba } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';

describe('MenuDeAcciones (⋮)', () => {
  const acciones = () => ({
    editar: jest.fn(),
    borrar: jest.fn(),
  });

  function montar(a: ReturnType<typeof acciones>) {
    return render(
      <MenuDeAcciones
        etiqueta="Más acciones del lote"
        acciones={[
          { titulo: 'Editar lote', icono: 'create-outline', alPulsar: a.editar },
          { titulo: 'Borrar lote', icono: 'trash-outline', alPulsar: a.borrar, peligro: true },
        ]}
      />,
    );
  }

  it('cerrado solo muestra el botón, con su nombre accesible', async () => {
    await montar(acciones());

    expect(screen.getByRole('button', { name: 'Más acciones del lote' })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('abierto lista las acciones como opciones de menú y «borrar» queda al final', async () => {
    await montar(acciones());

    await fireEvent.press(screen.getByRole('button', { name: 'Más acciones del lote' }));

    const opciones = screen
      .getAllByRole('menuitem')
      .map((opcion) => opcion.props.accessibilityLabel);
    expect(opciones).toEqual(['Editar lote', 'Borrar lote']);
  });

  it('elegir una opción la ejecuta y cierra el menú', async () => {
    const a = acciones();
    await montar(a);
    await fireEvent.press(screen.getByRole('button', { name: 'Más acciones del lote' }));

    await fireEvent.press(screen.getByRole('menuitem', { name: 'Editar lote' }));

    expect(a.editar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('tocar fuera lo cierra sin ejecutar nada', async () => {
    const a = acciones();
    await montar(a);
    await fireEvent.press(screen.getByRole('button', { name: 'Más acciones del lote' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar el menú' }));

    expect(screen.queryByRole('menu')).toBeNull();
    expect(a.editar).not.toHaveBeenCalled();
    expect(a.borrar).not.toHaveBeenCalled();
  });
});

describe('Chip (filtro)', () => {
  it('lo elegido lleva marca y estado «seleccionado», y es de 48 dp', async () => {
    const alPulsar = jest.fn();
    await render(<Chip titulo="Riego" activo onPress={alPulsar} />);

    const chip = screen.getByRole('button', { name: 'Riego' });
    expect(chip.props.accessibilityState).toMatchObject({ selected: true });
    expect(chip.props.className).toContain('bg-primary-soft');
    expect(chip.props.className).toContain('min-h-[48px]');
    await fireEvent.press(chip);
    expect(alPulsar).toHaveBeenCalledTimes(1);
  });

  it('lo no elegido no está seleccionado', async () => {
    await render(<Chip titulo="Poda" activo={false} onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Poda' }).props.accessibilityState).toMatchObject({
      selected: false,
    });
  });
});

describe('ConsejoDeGestos (una sola vez, D105)', () => {
  it('aparece la primera vez, se cierra con «Entendido» y no vuelve a aparecer', async () => {
    const ctx = await crearContextoDePrueba();
    const Envoltorio = crearEnvoltorio(ctx);
    const primera = await render(
      <Envoltorio>
        <ConsejoDeGestos />
      </Envoltorio>,
    );

    expect(await screen.findByText(/Mantén presionada una labor/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Entendido' }));

    expect(screen.queryByText(/Mantén presionada una labor/)).toBeNull();
    await waitFor(async () => expect(await leerAjuste(ctx.db, CONSEJO_GESTOS)).toBe('1'));

    await primera.unmount();
    await render(
      <Envoltorio>
        <ConsejoDeGestos />
      </Envoltorio>,
    );
    await waitFor(() => expect(screen.queryByText(/Mantén presionada una labor/)).toBeNull());
  });
});
