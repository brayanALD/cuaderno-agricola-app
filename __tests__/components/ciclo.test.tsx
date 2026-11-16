import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { FormularioCiclo } from '@/components/formularios/FormularioCiclo';
import { exito } from '@/services/resultado';

const HOY = '2026-11-14';

describe('FormularioCiclo (D95, D104)', () => {
  const montar = () => {
    const props = {
      fechaSiembra: '2026-08-16',
      cultivoActual: 'Café',
      hoy: HOY,
      alGuardar: jest.fn().mockResolvedValue(exito(null)),
      alTerminar: jest.fn(),
    };
    return { props, listo: render(<FormularioCiclo {...props} />) };
  };

  it('dice con exactitud qué se conserva y qué cambia antes de pedir nada', async () => {
    await montar().listo;

    expect(screen.getByText('Se conserva')).toBeTruthy();
    expect(screen.getByText('La bitácora de labores y sus fotos')).toBeTruthy();
    expect(
      screen.getByText('El ciclo cerrado, en «Ciclos anteriores», con su total de kg'),
    ).toBeTruthy();
    expect(screen.getByText('Cambia')).toBeTruthy();
    expect(screen.getByText('La producción y los costos del lote vuelven a 0')).toBeTruthy();
  });

  it('propone cerrar y sembrar hoy con el mismo cultivo, y lo guarda', async () => {
    const { props, listo } = montar();
    await listo;

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar ciclo' }));

    await waitFor(() => expect(props.alTerminar).toHaveBeenCalledTimes(1));
    expect(props.alGuardar).toHaveBeenCalledWith({
      fecha_fin: HOY,
      cultivo: 'Café',
      fecha_siembra: HOY,
    });
  });

  it('la fecha de cierre y la de siembra se eligen con Hoy / Ayer / Otra fecha', async () => {
    await montar().listo;

    expect(screen.getAllByRole('radio', { name: 'Ayer' })).toHaveLength(2);
    expect(screen.getAllByRole('radio', { name: 'Otra fecha' })).toHaveLength(2);
  });
});
