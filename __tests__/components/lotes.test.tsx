import { fireEvent, render, screen } from '@testing-library/react-native';
import { BarraDeBusqueda } from '@/components/BarraDeBusqueda';
import { Fab } from '@/components/Fab';
import { FilaLote } from '@/components/FilaLote';
import { FranjaDeLabor } from '@/components/FranjaDeLabor';
import type { LoteConDias } from '@/services/loteService';
import { loteFila } from '../helpers/filas';

const lote = (cambios = {}): LoteConDias => ({ ...loteFila(cambios), dias_desde_siembra: 90 });

describe('FranjaDeLabor: qué toca y cuándo', () => {
  it('hoy: dorada, con la fecha', async () => {
    await render(<FranjaDeLabor tipo="riego" fecha="2026-11-15" diasRestantes={0} />);

    expect(screen.getByText('Riego')).toBeTruthy();
    expect(screen.getByText('15 de noviembre de 2026')).toBeTruthy();
    expect(screen.getByText('Hoy').props.className).toContain('text-on-accent');
  });

  it('vencida: rojo suave con icono y la palabra «Vencida», nunca solo color', async () => {
    await render(<FranjaDeLabor tipo="fumigacion" fecha="2026-11-13" diasRestantes={-2} />);

    expect(screen.getByText('Vencida').props.className).toContain('text-danger');
    expect(screen.getByText('Venció hace 2 días')).toBeTruthy();
    expect(screen.queryByText('13 de noviembre de 2026')).toBeNull();
  });

  it('próxima: neutra, con cuándo llega', async () => {
    await render(<FranjaDeLabor tipo="poda" fecha="2026-11-20" diasRestantes={5} />);

    expect(screen.getByText('En 5 días').props.className).toContain('text-text-muted');
  });

  it('acepta un título propio (el lote, en la pestaña Labores)', async () => {
    await render(
      <FranjaDeLabor tipo="poda" fecha="2026-11-20" diasRestantes={5} titulo="Poda · El Mirador" />,
    );

    expect(screen.getByText('Poda · El Mirador')).toBeTruthy();
  });
});

describe('FilaLote con la labor que toca (D104)', () => {
  it('muestra la franja y la lee dentro de su descripción accesible', async () => {
    await render(
      <FilaLote
        lote={lote({ pending: 0 })}
        proxima={{ tipo: 'riego', fecha: '2026-11-15', diasRestantes: 0 }}
        alAbrir={jest.fn()}
      />,
    );

    expect(screen.getByText('Hoy')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Lote El Mirador, Café, 90 días, próxima labor: Riego, Hoy. Abrir',
      }),
    ).toBeTruthy();
  });

  it('sin labor sugerida no pinta la franja', async () => {
    await render(<FilaLote lote={lote()} alAbrir={jest.fn()} />);

    expect(screen.queryByText('Hoy')).toBeNull();
    expect(screen.queryByText('Riego')).toBeNull();
  });

  it('los días desde la siembra son información, no una alerta: insignia neutra', async () => {
    await render(<FilaLote lote={lote()} alAbrir={jest.fn()} />);

    expect(screen.getByText('90 días').props.className).toContain('text-text-muted');
  });
});

describe('BarraDeBusqueda', () => {
  it('se nombra con lo que busca y avisa de cada cambio', async () => {
    const alCambiar = jest.fn();
    await render(<BarraDeBusqueda etiqueta="Buscar lote" valor="" alCambiar={alCambiar} />);

    await fireEvent.changeText(screen.getByLabelText('Buscar lote'), 'café');

    expect(alCambiar).toHaveBeenCalledWith('café');
    expect(screen.queryByRole('button', { name: 'Borrar la búsqueda' })).toBeNull();
  });

  it('con texto ofrece un botón de 48 dp para borrarlo', async () => {
    const alCambiar = jest.fn();
    await render(<BarraDeBusqueda etiqueta="Buscar lote" valor="café" alCambiar={alCambiar} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Borrar la búsqueda' }));

    expect(alCambiar).toHaveBeenCalledWith('');
  });
});

describe('Fab', () => {
  it('es la acción principal: botón con texto, de 56 dp, que responde', async () => {
    const alPulsar = jest.fn();
    await render(<Fab titulo="Nuevo lote" icono="add" onPress={alPulsar} />);

    const boton = screen.getByRole('button', { name: 'Nuevo lote' });
    await fireEvent.press(boton);

    expect(alPulsar).toHaveBeenCalledTimes(1);
    expect(boton.props.className).toContain('min-h-[56px]');
    expect(screen.getByText('Nuevo lote')).toBeTruthy();
  });
});
