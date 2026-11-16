import { esHoraValida, planificarRecordatorios } from '@/services/planRecordatorios';

const HOY = '2026-11-14';
const lote = (id: string, nombre: string, fecha_siembra = '2026-08-16') => ({
  id,
  nombre,
  fecha_siembra,
});
/** Instante local de HOY a la hora dada (las pruebas no dependen de la zona horaria de la máquina). */
const hoyA = (horas: number, minutos = 0, dia = 14) => new Date(2026, 10, dia, horas, minutos);

describe('planificarRecordatorios (D90): un aviso por lote para el próximo riego', () => {
  it('el próximo riego es 3 días después del último riego, a la hora elegida', () => {
    const [aviso] = planificarRecordatorios(
      [lote('a', 'El Mirador')],
      [{ lote_id: 'a', fecha: '2026-11-13' }],
      HOY,
      hoyA(6),
      '07:00',
    );

    expect(aviso?.cuando).toEqual(hoyA(7, 0, 16));
    expect(aviso?.id).toBe('riego-a');
    expect(aviso?.titulo).toBe('Hora de regar: El Mirador');
    expect(aviso?.cuerpo).toBe('Toca regar según tu bitácora (cada 3 días).');
  });

  it('usa el riego MÁS RECIENTE del lote e ignora los de otros lotes', () => {
    const [aviso] = planificarRecordatorios(
      [lote('a', 'El Mirador')],
      [
        { lote_id: 'a', fecha: '2026-11-01' },
        { lote_id: 'a', fecha: '2026-11-14' },
        { lote_id: 'b', fecha: '2026-11-20' },
      ],
      HOY,
      hoyA(6),
      '07:00',
    );

    expect(aviso?.cuando).toEqual(hoyA(7, 0, 17));
  });

  it('un lote que nunca se regó cuenta desde su siembra', () => {
    const [aviso] = planificarRecordatorios(
      [lote('a', 'Nuevo', '2026-11-14')],
      [],
      HOY,
      hoyA(6),
      '07:00',
    );

    expect(aviso?.cuando).toEqual(hoyA(7, 0, 17));
  });

  it('si el riego ya venció y aún no pasó la hora de hoy, avisa hoy y lo dice', () => {
    const [aviso] = planificarRecordatorios(
      [lote('a', 'El Mirador', '2026-11-01')],
      [],
      HOY,
      hoyA(6),
      '07:00',
    );

    expect(aviso?.cuando).toEqual(hoyA(7));
    expect(aviso?.cuerpo).toBe('El riego venció el 4 de noviembre de 2026.');
  });

  it('si ya venció y la hora de hoy ya pasó, avisa mañana a esa hora (nunca en el pasado)', () => {
    const [aviso] = planificarRecordatorios(
      [lote('a', 'El Mirador', '2026-11-01')],
      [],
      HOY,
      hoyA(8),
      '07:00',
    );

    expect(aviso?.cuando).toEqual(hoyA(7, 0, 15));
  });

  it('si toca hoy pero la hora ya pasó, avisa mañana', () => {
    const [aviso] = planificarRecordatorios(
      [lote('a', 'El Mirador')],
      [{ lote_id: 'a', fecha: '2026-11-11' }],
      HOY,
      hoyA(9),
      '07:00',
    );

    expect(aviso?.cuando).toEqual(hoyA(7, 0, 15));
    expect(aviso?.cuerpo).toBe('Toca regar según tu bitácora (cada 3 días).');
  });

  it('respeta una hora elegida distinta (18:30)', () => {
    const [aviso] = planificarRecordatorios(
      [lote('a', 'El Mirador')],
      [{ lote_id: 'a', fecha: '2026-11-13' }],
      HOY,
      hoyA(6),
      '18:30',
    );

    expect(aviso?.cuando).toEqual(hoyA(18, 30, 16));
  });

  it('cada lote tiene su aviso; sin lotes no hay avisos', () => {
    const avisos = planificarRecordatorios(
      [lote('a', 'Uno'), lote('b', 'Dos')],
      [],
      HOY,
      hoyA(6),
      '07:00',
    );

    expect(avisos.map((a) => a.id)).toEqual(['riego-a', 'riego-b']);
    expect(planificarRecordatorios([], [], HOY, hoyA(6), '07:00')).toEqual([]);
  });
});

describe('esHoraValida', () => {
  it.each(['00:00', '07:00', '18:30', '23:59'])('acepta %s', (hora) => {
    expect(esHoraValida(hora)).toBe(true);
  });

  it.each(['24:00', '7:00', '07:60', '07-00', '', 'ab:cd'])('rechaza «%s»', (hora) => {
    expect(esHoraValida(hora)).toBe(false);
  });
});
