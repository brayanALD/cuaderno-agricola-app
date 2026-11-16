import {
  diasDesdeSiembra,
  esFechaValida,
  fechaDesdeISO,
  fechaLocalISO,
  formatearFecha,
  formatearMes,
  semanasDelMes,
  sumarDias,
  sumarMeses,
} from '@/services/fechas';

describe('fechaDesdeISO', () => {
  it('crea la medianoche local de ese día (no la de UTC)', () => {
    const fecha = fechaDesdeISO('2026-11-14');

    expect([fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), fecha.getHours()]).toEqual([
      2026, 10, 14, 0,
    ]);
  });

  it('es la inversa de fechaLocalISO', () => {
    expect(fechaLocalISO(fechaDesdeISO('2028-02-29'))).toBe('2028-02-29');
  });

  it('lanza RangeError con una fecha inexistente', () => {
    expect(() => fechaDesdeISO('2026-02-30')).toThrow(RangeError);
  });
});

describe('formatearMes', () => {
  it('escribe el mes de la producción (AAAA-MM) en español', () => {
    expect(formatearMes('2026-11')).toBe('noviembre de 2026');
    expect(formatearMes('2027-01')).toBe('enero de 2027');
  });

  it('lanza RangeError si no es un mes válido', () => {
    expect(() => formatearMes('2026-13')).toThrow(RangeError);
    expect(() => formatearMes('noviembre')).toThrow(RangeError);
  });
});

describe('formatearFecha', () => {
  it('la escribe en español para leerla (y para el lector de pantalla)', () => {
    expect(formatearFecha('2026-11-14')).toBe('14 de noviembre de 2026');
    expect(formatearFecha('2026-01-05')).toBe('5 de enero de 2026');
  });

  it('lanza RangeError con una fecha inexistente', () => {
    expect(() => formatearFecha('no-es-fecha')).toThrow(RangeError);
  });
});

describe('esFechaValida', () => {
  it.each(['2026-11-14', '2028-02-29', '2026-12-31'])('acepta %s', (fecha) => {
    expect(esFechaValida(fecha)).toBe(true);
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '14/11/2026', '2026-1-1', ''])(
    'rechaza «%s»',
    (fecha) => {
      expect(esFechaValida(fecha)).toBe(false);
    },
  );
});

describe('diasDesdeSiembra (criterio de aceptación 1)', () => {
  it('un lote sembrado hace 90 días muestra 90', () => {
    expect(diasDesdeSiembra('2026-08-16', '2026-11-14')).toBe(90);
  });

  it('el mismo día de la siembra son 0 días', () => {
    expect(diasDesdeSiembra('2026-11-14', '2026-11-14')).toBe(0);
  });

  it('cruza el fin de año y los años bisiestos', () => {
    expect(diasDesdeSiembra('2027-12-31', '2028-03-01')).toBe(61);
  });

  it('una siembra futura da un número negativo', () => {
    expect(diasDesdeSiembra('2026-11-19', '2026-11-14')).toBe(-5);
  });
});

describe('fechas inexistentes', () => {
  it('lanzan RangeError en vez de calcular con basura', () => {
    expect(() => diasDesdeSiembra('2026-02-30', '2026-11-14')).toThrow(RangeError);
    expect(() => diasDesdeSiembra('2026-08-16', 'ayer')).toThrow(RangeError);
    expect(() => sumarDias('no-es-fecha', 1)).toThrow(RangeError);
  });
});

describe('sumarDias', () => {
  it('suma dentro del mes', () => {
    expect(sumarDias('2026-11-14', 3)).toBe('2026-11-17');
  });

  it('cruza el fin de año', () => {
    expect(sumarDias('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('resta con un número negativo', () => {
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('fechaLocalISO', () => {
  it('usa el día local, no el UTC', () => {
    expect(fechaLocalISO(new Date(2026, 10, 14, 23, 59))).toBe('2026-11-14');
  });

  it('rellena mes y día con cero', () => {
    expect(fechaLocalISO(new Date(2026, 0, 5, 8, 0))).toBe('2026-01-05');
  });
});

describe('calendario propio (D108)', () => {
  it('sumarMeses cruza el cambio de año en los dos sentidos', () => {
    expect(sumarMeses('2026-11', 1)).toBe('2026-12');
    expect(sumarMeses('2026-12', 1)).toBe('2027-01');
    expect(sumarMeses('2026-01', -1)).toBe('2025-12');
    expect(sumarMeses('2026-11', -13)).toBe('2025-10');
  });

  it('semanasDelMes empieza en lunes y rellena los huecos con null', () => {
    // 1 de noviembre de 2026 es domingo: seis huecos antes.
    const semanas = semanasDelMes('2026-11');

    expect(semanas[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
    expect(semanas[1]?.[0]).toBe('2026-11-02');
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
    expect(semanas.flat().filter((dia) => dia !== null)).toHaveLength(30);
    expect(semanas.at(-1)?.at(-1)).toBeNull();
  });

  it('un mes que empieza en lunes no lleva huecos al principio y febrero bisiesto tiene 29 días', () => {
    expect(semanasDelMes('2026-06')[0]?.[0]).toBe('2026-06-01');
    expect(
      semanasDelMes('2028-02')
        .flat()
        .filter((dia) => dia !== null),
    ).toHaveLength(29);
  });
});
