import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import PantallaLotes from '../../app/(app)/(tabs)/index';
import PantallaLabores from '../../app/(app)/(tabs)/labores';
import { crearContextoDePrueba, datosLabor, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { Raiz } from '../helpers/gestos';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

async function montar(pantalla: () => React.JSX.Element, sembrar: boolean) {
  const ctx = await crearContextoDePrueba();
  if (sembrar) {
    await crearLote(ctx, datosLote({ fecha_siembra: '2026-08-16' }));
    await crearLabor(
      ctx,
      'id-1',
      datosLabor({ tipo: 'cosecha', fecha: '2026-11-05', cantidad: 12.5 }),
    );
  }
  const Envoltorio = crearEnvoltorio(ctx);
  await render(
    <Raiz>
      <Envoltorio>{pantalla()}</Envoltorio>
    </Raiz>,
  );
  return ctx;
}

describe('pestaña Lotes: resumen y estado de sincronización (D99, D100)', () => {
  it('con lotes muestra el resumen y el aviso de lo que falta enviar', async () => {
    await montar(() => <PantallaLotes />, true);

    expect(await screen.findByText('Resumen')).toBeTruthy();
    expect(screen.getByLabelText('Cosechado en noviembre de 2026: 12,5 kg')).toBeTruthy();
    expect(await screen.findByText(/^2 cambios sin enviar\./)).toBeTruthy();
  });

  it('sin lotes no hay resumen y se explica qué hacer', async () => {
    await montar(() => <PantallaLotes />, false);

    expect(await screen.findByText('Aún no hay lotes')).toBeTruthy();
    expect(screen.queryByText('Resumen')).toBeNull();
    expect(screen.queryByText(/sin enviar/)).toBeNull();
  });

  it('mientras se busca, el resumen se quita para dejar sitio a los resultados', async () => {
    await montar(() => <PantallaLotes />, true);
    expect(await screen.findByText('Resumen')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Buscar lote o cultivo'), 'Mirador');

    await waitFor(() => expect(screen.queryByText('Resumen')).toBeNull());
    expect(screen.getByText('El Mirador')).toBeTruthy();
  });
});

describe('pestaña Labores: aviso de cambios sin enviar (D99)', () => {
  it('lo muestra cuando hay cambios pendientes', async () => {
    await montar(() => <PantallaLabores />, true);

    expect(await screen.findByText(/^2 cambios sin enviar\./)).toBeTruthy();
  });

  it('sin pendientes no aparece', async () => {
    await montar(() => <PantallaLabores />, false);

    expect(await screen.findByText('Aún no hay labores')).toBeTruthy();
    expect(screen.queryByText(/sin enviar/)).toBeNull();
  });
});
