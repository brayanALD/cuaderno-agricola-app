import { formatearFechaHora } from '@/services/fechas';

describe('formatearFechaHora', () => {
  it('muestra el día y la hora en el horario del teléfono (24 h)', () => {
    // Se construye con componentes locales: el resultado no depende de la zona horaria de quien corra la prueba.
    const instante = new Date(2026, 10, 15, 9, 5).toISOString();

    expect(formatearFechaHora(instante)).toBe('15 de noviembre de 2026, 09:05');
  });

  it('rellena con ceros la hora y los minutos', () => {
    expect(formatearFechaHora(new Date(2027, 0, 3, 0, 0).toISOString())).toBe(
      '3 de enero de 2027, 00:00',
    );
  });

  it('una fecha que no existe lanza RangeError', () => {
    expect(() => formatearFechaHora('no es una fecha')).toThrow(RangeError);
  });
});
