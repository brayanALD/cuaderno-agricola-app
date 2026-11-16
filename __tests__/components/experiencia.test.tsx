import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AvisoDePendientes } from '@/components/AvisoDePendientes';
import { descripcionDeEstado, EstadoDeFila } from '@/components/EstadoDeFila';
import { FilaLabor } from '@/components/FilaLabor';
import { FilaLote } from '@/components/FilaLote';
import { anchoDeBarra, GraficoProduccion } from '@/components/GraficoProduccion';
import { FormularioLabor } from '@/components/formularios/FormularioLabor';
import { PanelResumen } from '@/components/PanelResumen';
import { marcarLoteConError } from '@/repositories/loteRepository';
import { valoresLaborVacios } from '@/services/formularios';
import { crearLabor, type UltimasLabores } from '@/services/laborService';
import { crearLote, type LoteConDias } from '@/services/loteService';
import { exito } from '@/services/resultado';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { AHORA, laborFila, loteFila } from '../helpers/filas';

jest.mock('@react-native-community/datetimepicker', () => ({
  DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));

const Raiz = ({ children }: { children: ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>{children}</GestureHandlerRootView>
);

const lote = (cambios = {}): LoteConDias => ({ ...loteFila(cambios), dias_desde_siembra: 90 });

describe('estado por fila (D99)', () => {
  it('pendiente: icono y texto «Pendiente de enviar»', async () => {
    await render(<EstadoDeFila pending={1} syncError={null} />);

    expect(screen.getByText('Pendiente de enviar', { includeHiddenElements: true })).toBeTruthy();
  });

  it('sincronizado: «Sincronizado»', async () => {
    await render(<EstadoDeFila pending={0} syncError={null} />);

    expect(screen.getByText('Sincronizado', { includeHiddenElements: true })).toBeTruthy();
  });

  it('con aviso no repite nada: ya está el motivo en el aviso', async () => {
    await render(<EstadoDeFila pending={1} syncError="Algo falló" />);

    expect(screen.toJSON()).toBeNull();
  });

  it('el lector de pantalla recibe «Pendiente de enviar» solo cuando falta enviarla', () => {
    expect(descripcionDeEstado(1, null)).toBe('. Pendiente de enviar');
    expect(descripcionDeEstado(0, null)).toBe('');
    expect(descripcionDeEstado(1, 'aviso')).toBe('');
  });

  it('una fila de lote pendiente lo dice a la vista y en su descripción accesible', async () => {
    await render(<FilaLote lote={lote({ pending: 1 })} alAbrir={jest.fn()} />);

    expect(screen.getByText('Pendiente de enviar', { includeHiddenElements: true })).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Lote El Mirador, Café, 90 días. Pendiente de enviar. Abrir',
      }),
    ).toBeTruthy();
  });

  it('una fila de lote sincronizada muestra «Sincronizado» y no cambia su descripción', async () => {
    await render(<FilaLote lote={lote({ pending: 0 })} alAbrir={jest.fn()} />);

    expect(screen.getByText('Sincronizado', { includeHiddenElements: true })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Lote El Mirador, Café, 90 días. Abrir' }),
    ).toBeTruthy();
  });

  it('una labor pendiente y una sincronizada se distinguen', async () => {
    await render(
      <Raiz>
        <FilaLabor
          labor={laborFila({ pending: 1 })}
          alEditar={jest.fn()}
          alDuplicar={jest.fn()}
          alBorrar={jest.fn()}
        />
        <FilaLabor
          labor={laborFila({ id: 'labor-2', pending: 0 })}
          alEditar={jest.fn()}
          alDuplicar={jest.fn()}
          alBorrar={jest.fn()}
        />
      </Raiz>,
    );

    expect(
      screen.getAllByText('Pendiente de enviar', { includeHiddenElements: true }),
    ).toHaveLength(1);
    expect(screen.getAllByText('Sincronizado', { includeHiddenElements: true })).toHaveLength(1);
  });
});

async function montar(
  pantalla: ReactNode,
  sembrar?: (c: Awaited<ReturnType<typeof crearContextoDePrueba>>) => Promise<void>,
) {
  const ctx = await crearContextoDePrueba();
  await sembrar?.(ctx);
  const Envoltorio = crearEnvoltorio(ctx);
  await render(
    <Raiz>
      <Envoltorio>{pantalla}</Envoltorio>
    </Raiz>,
  );
  return ctx;
}

describe('aviso global de cambios sin enviar (D99)', () => {
  it('sin nada pendiente no pinta nada', async () => {
    await montar(<AvisoDePendientes />);

    await waitFor(() => expect(screen.queryByText(/sin enviar/)).toBeNull());
  });

  it('dice cuántos cambios faltan enviar (1 en singular, varios en plural)', async () => {
    const ctx = await montar(<AvisoDePendientes />, async (c) => {
      await crearLote(c, datosLote());
    });

    expect(await screen.findByText(/^1 cambio sin enviar\./)).toBeTruthy();

    await crearLabor(ctx, 'id-1', datosLabor());
    await ctx.db.execAsync('UPDATE labor SET pending = 1');
  });

  it('con varios cambios usa el plural y avisa de los que tienen aviso', async () => {
    await montar(<AvisoDePendientes />, async (c) => {
      await crearLote(c, datosLote());
      await crearLabor(c, 'id-1', datosLabor());
      await marcarLoteConError(c.db, 'id-1', AHORA, 'Ya existe otro lote con ese nombre.');
      await c.db.execAsync("UPDATE lote SET updated_at = '" + AHORA + "'");
    });

    expect(await screen.findByText(/^2 cambios sin enviar\./)).toBeTruthy();
    expect(screen.getByText(/1 tiene un aviso: ábrelo para corregirlo\./)).toBeTruthy();
  });
});

describe('panel resumen (D100)', () => {
  it('sin lotes no pinta nada', async () => {
    await montar(<PanelResumen />);

    await waitFor(() => expect(screen.queryByText('Resumen')).toBeNull());
  });

  it('muestra lotes, labores que tocan hoy y lo cosechado este mes', async () => {
    await montar(<PanelResumen />, async (c) => {
      await crearLote(c, datosLote({ fecha_siembra: '2026-08-16' }));
      await crearLabor(
        c,
        'id-1',
        datosLabor({ tipo: 'cosecha', fecha: '2026-11-05', cantidad: 12.5 }),
      );
    });

    expect(await screen.findByText('Resumen')).toBeTruthy();
    expect(screen.getByLabelText('Lote: 1')).toBeTruthy();
    expect(screen.getByLabelText('Labor toca hoy o venció: 1')).toBeTruthy();
    expect(screen.getByLabelText('Cosechado en noviembre de 2026: 12,5 kg')).toBeTruthy();
  });
});

describe('gráfico de producción (D101)', () => {
  it('el mes mayor ocupa todo el ancho y los demás son proporcionales', () => {
    expect(anchoDeBarra(50, 50)).toBe(100);
    expect(anchoDeBarra(25, 50)).toBe(50);
  });

  it('un mes pequeño nunca queda invisible y sin cosecha no hay barra', () => {
    expect(anchoDeBarra(0.1, 1000)).toBe(4);
    expect(anchoDeBarra(0, 50)).toBe(0);
    expect(anchoDeBarra(5, 0)).toBe(0);
  });

  it('cada mes lleva su texto con los kg y su barra', async () => {
    await render(
      <GraficoProduccion
        meses={[
          { mes: '2026-10', kg: 12.5 },
          { mes: '2026-11', kg: 25 },
        ]}
      />,
    );

    expect(screen.getByText('octubre de 2026: 12,5 kg')).toBeTruthy();
    expect(screen.getByText('noviembre de 2026: 25 kg')).toBeTruthy();
    expect(screen.getByTestId('barra-2026-10', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('barra-2026-11', { includeHiddenElements: true })).toBeTruthy();
  });

  it('la barra es solo apoyo visual: se oculta al lector de pantalla', async () => {
    await render(<GraficoProduccion meses={[{ mes: '2026-10', kg: 12.5 }]} />);

    expect(
      screen.getByTestId('barra-2026-10', { includeHiddenElements: true }).props
        .accessibilityElementsHidden,
    ).toBe(true);
  });
});

describe('repetir la última labor (D100)', () => {
  const ultimas = {
    riego: laborFila({ tipo: 'riego', cantidad: 20, unidad: 'L' }),
    fumigacion: laborFila({
      tipo: 'fumigacion',
      cantidad: 8,
      unidad: 'L',
      producto: 'Mancozeb',
      carencia_dias: 21,
      costo: 35000,
      nota: 'Control de roya',
    }),
  };

  async function formulario(ultimasLabores?: UltimasLabores) {
    const alGuardar = jest.fn().mockResolvedValue(exito(null));
    await render(
      <Raiz>
        <FormularioLabor
          fechaSiembra="2026-08-16"
          valoresIniciales={valoresLaborVacios('2026-11-14')}
          hoy="2026-11-14"
          ultimas={ultimasLabores}
          textoBoton="Registrar labor"
          alGuardar={alGuardar}
          alTerminar={jest.fn()}
        />
      </Raiz>,
      { wrapper: crearEnvoltorio(await crearContextoDePrueba()) },
    );
    return alGuardar;
  }

  it('si ya se hizo una de este tipo ofrece repetirla y dice con qué valores', async () => {
    await formulario(ultimas);

    expect(screen.getByRole('button', { name: 'Repetir la última de riego' })).toBeTruthy();
    expect(screen.getByText('Última de riego: 20 L')).toBeTruthy();
  });

  it('no lo ofrece al editar (sin `ultimas`) ni para un tipo sin historial', async () => {
    await formulario(undefined);
    expect(screen.queryByRole('button', { name: /Repetir la última/ })).toBeNull();
  });

  it('un tipo sin historial no muestra el botón', async () => {
    await formulario({ riego: ultimas.riego });

    await fireEvent.press(screen.getByRole('radio', { name: 'Poda' }));

    expect(screen.queryByRole('button', { name: /Repetir la última/ })).toBeNull();
  });

  it('repetir rellena cantidad, unidad, producto, carencia y costo, pero conserva la fecha elegida y no copia la nota', async () => {
    const alGuardar = await formulario(ultimas);

    await fireEvent.press(screen.getByRole('radio', { name: 'Fumigación' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Repetir la última de fumigación' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Registrar labor' }));

    await waitFor(() => expect(alGuardar).toHaveBeenCalledTimes(1));
    expect(alGuardar.mock.calls[0]?.[0]).toMatchObject({
      tipo: 'fumigacion',
      fecha: '2026-11-14',
      cantidad: 8,
      unidad: 'L',
      producto: 'Mancozeb',
      carencia_dias: 21,
      costo: 35000,
      nota: null,
    });
  });
});
