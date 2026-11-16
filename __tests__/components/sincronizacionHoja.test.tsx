import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { AvisoDePendientes } from '@/components/AvisoDePendientes';
import { PanelSincronizacion } from '@/components/PanelSincronizacion';
import { CuadernoProvider } from '@/context/CuadernoContext';
import { SincronizacionProvider, useSincronizacion } from '@/context/SincronizacionContext';
import { marcarLoteConError } from '@/repositories/loteRepository';
import { describirPendiente } from '@/services/pendientesService';
import { crearLabor } from '@/services/laborService';
import { crearLote } from '@/services/loteService';
import { datosLabor, datosLote } from '../helpers/contexto';
import { crearDispositivo } from '../helpers/dispositivo';
import { AHORA } from '../helpers/filas';
import { crearServidorFalso } from '../helpers/servidorFalso';

describe('describirPendiente (D105)', () => {
  const base = {
    clase: 'lote' as const,
    id: 'x',
    lote: 'La Esperanza',
    tipo_labor: null,
    fecha: null,
    borrado: 0 as const,
    aviso: null,
    conflicto: 0 as const,
  };

  it('un lote cambiado: su nombre, «Cambio del lote» y pendiente', () => {
    expect(describirPendiente(base)).toMatchObject({
      titulo: 'La Esperanza',
      detalle: 'Cambio del lote',
      estado: 'pendiente',
    });
  });

  it('una labor: tipo y lote en el título, su fecha en palabras', () => {
    expect(
      describirPendiente({ ...base, clase: 'labor', tipo_labor: 'riego', fecha: '2026-11-15' }),
    ).toMatchObject({
      titulo: 'Riego · La Esperanza',
      detalle: 'Cambio · 15 de noviembre de 2026',
    });
  });

  it('un borrado lo dice', () => {
    expect(describirPendiente({ ...base, borrado: 1 }).detalle).toBe('Borrado del lote');
  });

  it('con aviso lleva el motivo; con conflicto, el estado conflicto (manda sobre el aviso)', () => {
    expect(describirPendiente({ ...base, aviso: 'Ya existe.' })).toMatchObject({
      estado: 'aviso',
      aviso: 'Ya existe.',
    });
    expect(describirPendiente({ ...base, aviso: 'Ya existe.', conflicto: 1 }).estado).toBe(
      'conflicto',
    );
  });
});

function Panel() {
  return <PanelSincronizacion sync={useSincronizacion()} />;
}

async function montar(hijo: ReactNode) {
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  const { ctx } = await crearDispositivo();
  await crearLote(ctx, datosLote({ nombre: 'La Esperanza' }));
  await crearLabor(ctx, 'a-1', datosLabor({ tipo: 'riego', fecha: '2026-11-12' }));
  await marcarLoteConError(ctx.db, 'a-1', AHORA, 'Ya existe otro lote con ese nombre.');
  await ctx.db.execAsync(`UPDATE lote SET updated_at = '${AHORA}'`);
  const red = { actual: () => Promise.resolve(false), suscribir: () => () => undefined };
  await render(
    <CuadernoProvider abrir={() => Promise.resolve(ctx)} cargando={null} alError={() => null}>
      <SincronizacionProvider cliente={crearServidorFalso()} red={red}>
        {hijo}
      </SincronizacionProvider>
    </CuadernoProvider>,
  );
  return ctx;
}

afterEach(() => jest.restoreAllMocks());

describe('hoja de sincronización (D105)', () => {
  it('el aviso global abre la hoja con qué falta enviar, con lo que tiene aviso primero', async () => {
    await montar(<AvisoDePendientes />);

    await fireEvent.press(await screen.findByRole('button', { name: 'Ver qué falta enviar' }));

    expect(await screen.findByText('Cambios sin enviar')).toBeTruthy();
    expect(await screen.findByText('Ya existe otro lote con ese nombre.')).toBeTruthy();
    expect(screen.getByText('Con aviso')).toBeTruthy();
    expect(screen.getByText('Pendiente')).toBeTruthy();
    expect(screen.getByText('Riego · La Esperanza')).toBeTruthy();
    expect(screen.getByText('Sin conexión a internet.')).toBeTruthy();
  });

  it('se cierra tocando fuera', async () => {
    await montar(<AvisoDePendientes />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Ver qué falta enviar' }));
    await screen.findByText('Cambios sin enviar');

    await fireEvent.press(screen.getByRole('button', { name: 'Cerrar: Cambios sin enviar' }));

    expect(screen.queryByText('Cambios sin enviar')).toBeNull();
  });

  it('el panel de Cuenta ofrece «Ver qué falta» solo si algo falta', async () => {
    await montar(<Panel />);

    expect(await screen.findByRole('button', { name: 'Ver qué falta' })).toBeTruthy();
  });
});
