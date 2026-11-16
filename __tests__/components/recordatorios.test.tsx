import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CampoHora } from '@/components/CampoHora';
import { PanelRecordatorios } from '@/components/PanelRecordatorios';
import { ReprogramadorDeRecordatorios } from '@/components/ReprogramadorDeRecordatorios';
import type { EstadoPermiso } from '@/services/notificaciones';
import { crearContextoDePrueba, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { crearNotificacionesEnMemoria } from '../helpers/notificacionesEnMemoria';
import { crearLote } from '@/services/loteService';
import { activarRecordatorios } from '@/services/recordatoriosService';

// Renderizar el contexto con SQLite en memoria es lento cuando Jest corre en paralelo.
jest.setTimeout(20_000);

async function montarPanel(permiso: EstadoPermiso = 'sin-preguntar') {
  const notificaciones = crearNotificacionesEnMemoria(permiso);
  const ctx = { ...(await crearContextoDePrueba()), notificaciones };
  await crearLote(ctx, datosLote());
  const Envoltorio = crearEnvoltorio(ctx);
  await render(
    <Envoltorio>
      <PanelRecordatorios />
    </Envoltorio>,
  );
  await act(async () => undefined);
  return { ctx, notificaciones };
}

const interruptor = () => screen.getByRole('switch', { name: 'Activar recordatorios de riego' });

describe('PanelRecordatorios (RF-06)', () => {
  it('empieza apagado, con la hora por defecto y sin pedir ningún permiso', async () => {
    const { notificaciones } = await montarPanel();

    expect(interruptor().props.accessibilityState.checked).toBe(false);
    expect(screen.getByText('07:00')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /Hora del aviso: 07:00/ }).props.accessibilityState,
    ).toEqual(expect.objectContaining({ disabled: true }));
    expect(notificaciones.vecesPedido).toBe(0);
  });

  it('al encenderlo pide el permiso, programa el aviso y habilita la hora', async () => {
    const { notificaciones } = await montarPanel();

    await fireEvent.press(interruptor());
    await act(async () => undefined);

    expect(notificaciones.vecesPedido).toBe(1);
    expect(interruptor().props.accessibilityState.checked).toBe(true);
    expect(notificaciones.programados).toHaveLength(1);
  });

  it('si niegan el permiso, queda apagado y explica cómo activarlo', async () => {
    const { notificaciones } = await montarPanel();
    notificaciones.respuestaAlPedir = 'denegado';

    await fireEvent.press(interruptor());
    await act(async () => undefined);

    expect(interruptor().props.accessibilityState.checked).toBe(false);
    expect(screen.getByText(/permite las notificaciones de la app/)).toBeTruthy();
  });

  it('con el permiso denegado ofrece abrir los ajustes del teléfono', async () => {
    const abrir = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await montarPanel('denegado');

    await fireEvent.press(interruptor());
    await act(async () => undefined);
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir ajustes del teléfono' }));

    expect(abrir).toHaveBeenCalledTimes(1);
    abrir.mockRestore();
  });

  it('sin problema de permiso no aparece el botón de ajustes', async () => {
    await montarPanel('concedido');

    await fireEvent.press(interruptor());
    await act(async () => undefined);

    expect(screen.queryByRole('button', { name: 'Abrir ajustes del teléfono' })).toBeNull();
  });

  it('apagarlo cancela los avisos', async () => {
    const { notificaciones } = await montarPanel('concedido');
    await fireEvent.press(interruptor());
    await act(async () => undefined);

    await fireEvent.press(interruptor());
    await act(async () => undefined);

    expect(interruptor().props.accessibilityState.checked).toBe(false);
    expect(notificaciones.programados).toEqual([]);
  });

  it('elegir otra hora la guarda y reprograma', async () => {
    const { notificaciones } = await montarPanel('concedido');
    await fireEvent.press(interruptor());
    await act(async () => undefined);

    await fireEvent.press(screen.getByRole('button', { name: /Hora del aviso: 07:00/ }));
    for (let i = 0; i < 11; i++)
      await fireEvent.press(screen.getByRole('button', { name: 'Subir Horas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Subir Minutos' }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: 'Aceptar' }));
    });

    await waitFor(() => expect(screen.getByText('18:05')).toBeTruthy());
    expect(notificaciones.programados[0]?.cuando.getHours()).toBe(18);
  });
});

describe('CampoHora (reloj digital propio)', () => {
  it('abre con la hora actual del campo', async () => {
    await render(<CampoHora etiqueta="Hora" valor="07:30" onChange={jest.fn()} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Hora: 07:30. Cambiar' }));

    expect(screen.getByLabelText('Horas: 07')).toBeTruthy();
    expect(screen.getByLabelText('Minutos: 30')).toBeTruthy();
  });

  it('sube y baja con flechas: las horas de 1 en 1, los minutos de 5 en 5, dando la vuelta', async () => {
    const onChange = jest.fn();
    await render(<CampoHora etiqueta="Hora" valor="23:55" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Hora: 23:55. Cambiar' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Subir Horas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Subir Minutos' }));
    expect(screen.getByLabelText('Horas: 00')).toBeTruthy();
    expect(screen.getByLabelText('Minutos: 00')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Bajar Horas' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Aceptar' }));

    expect(onChange).toHaveBeenCalledWith('23:00');
  });

  it('cancelar no cambia nada y al volver a abrir parte de la hora del campo', async () => {
    const onChange = jest.fn();
    await render(<CampoHora etiqueta="Hora" valor="07:30" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Hora: 07:30. Cambiar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Subir Horas' }));

    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Hora: 07:30. Cambiar' }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Horas: 07')).toBeTruthy();
  });

  it('deshabilitado no abre el reloj', async () => {
    await render(<CampoHora etiqueta="Hora" valor="07:30" onChange={jest.fn()} deshabilitado />);

    await fireEvent.press(screen.getByRole('button', { name: 'Hora: 07:30. Cambiar' }));

    expect(screen.queryByLabelText('Horas: 07')).toBeNull();
  });
});

describe('ReprogramadorDeRecordatorios', () => {
  it('al abrir la app deja programados los avisos si los recordatorios están activos', async () => {
    const notificaciones = crearNotificacionesEnMemoria('concedido');
    const ctx = { ...(await crearContextoDePrueba()), notificaciones };
    await crearLote(ctx, datosLote());
    await activarRecordatorios(ctx);
    notificaciones.programados = [];
    const Envoltorio = crearEnvoltorio(ctx);

    await render(
      <Envoltorio>
        <ReprogramadorDeRecordatorios />
      </Envoltorio>,
    );

    await waitFor(() => expect(notificaciones.programados).toHaveLength(1));
  });
});
