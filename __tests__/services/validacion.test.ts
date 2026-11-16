import { crearLaborSchema, loteSchema } from '@/services/validacion';

const camposConError = (resultado: {
  success: boolean;
  error?: { issues: { path: PropertyKey[] }[] };
}): string[] =>
  resultado.success ? [] : (resultado.error?.issues.map((i) => String(i.path[0])) ?? []);

const loteValido = {
  nombre: 'Lote El Mirador',
  cultivo: 'Café',
  area_m2: 5000,
  altitud_m: 1650,
  lat: 4.65,
  lng: -75.57,
  fecha_siembra: '2026-08-16',
};

describe('loteSchema (sección 7)', () => {
  it('acepta un lote válido', () => {
    expect(loteSchema.safeParse(loteValido).success).toBe(true);
  });

  it('acepta altitud y coordenadas nulas (entrada manual pendiente)', () => {
    const resultado = loteSchema.safeParse({
      ...loteValido,
      altitud_m: null,
      lat: null,
      lng: null,
    });

    expect(resultado.success).toBe(true);
  });

  it.each([0, -5, 10.5])('rechaza un área de %s m² (debe ser entero > 0)', (area_m2) => {
    expect(camposConError(loteSchema.safeParse({ ...loteValido, area_m2 }))).toEqual(['area_m2']);
  });

  it.each([-1, 6001])('rechaza la altitud %s (rango 0–6000)', (altitud_m) => {
    expect(camposConError(loteSchema.safeParse({ ...loteValido, altitud_m }))).toEqual([
      'altitud_m',
    ]);
  });

  it.each([0, 6000])('acepta la altitud límite %s', (altitud_m) => {
    expect(loteSchema.safeParse({ ...loteValido, altitud_m }).success).toBe(true);
  });

  it('rechaza un nombre vacío o de solo espacios', () => {
    expect(camposConError(loteSchema.safeParse({ ...loteValido, nombre: '   ' }))).toEqual([
      'nombre',
    ]);
  });

  it('recorta los espacios del nombre', () => {
    const resultado = loteSchema.safeParse({ ...loteValido, nombre: '  Lote 1  ' });

    expect(resultado.success && resultado.data.nombre).toBe('Lote 1');
  });

  it('rechaza una fecha de siembra inexistente', () => {
    const resultado = loteSchema.safeParse({ ...loteValido, fecha_siembra: '2026-02-30' });

    expect(camposConError(resultado)).toEqual(['fecha_siembra']);
  });

  it('rechaza coordenadas fuera de rango', () => {
    expect(camposConError(loteSchema.safeParse({ ...loteValido, lat: 91 }))).toEqual(['lat']);
    expect(camposConError(loteSchema.safeParse({ ...loteValido, lng: -181 }))).toEqual(['lng']);
  });
});

describe('mensajes en español para valores ausentes o de otro tipo', () => {
  const mensajeDe = (resultado: ReturnType<typeof loteSchema.safeParse>, campo: string) =>
    resultado.success
      ? null
      : (resultado.error.issues.find((i) => i.path[0] === campo)?.message ?? null);

  it('un campo de texto ausente es obligatorio', () => {
    const { nombre: _nombre, ...sinNombre } = loteValido;

    expect(mensajeDe(loteSchema.safeParse(sinNombre), 'nombre')).toBe('Este campo es obligatorio.');
  });

  it('un número ausente o inválido pide escribir un número', () => {
    const { area_m2: _area, ...sinArea } = loteValido;

    expect(mensajeDe(loteSchema.safeParse(sinArea), 'area_m2')).toBe('Escribe un número.');
    expect(mensajeDe(loteSchema.safeParse({ ...loteValido, area_m2: Number.NaN }), 'area_m2')).toBe(
      'Escribe un número.',
    );
    expect(mensajeDe(loteSchema.safeParse({ ...loteValido, lat: 'x' }), 'lat')).toBe(
      'Escribe un número.',
    );
  });

  it('una fecha de siembra ausente es obligatoria', () => {
    const { fecha_siembra: _fecha, ...sinFecha } = loteValido;

    expect(mensajeDe(loteSchema.safeParse(sinFecha), 'fecha_siembra')).toBe(
      'Este campo es obligatorio.',
    );
  });

  it('el tipo y la luz inválidos piden elegir una opción', () => {
    const esquema = crearLaborSchema({ fechaSiembra: '2026-08-16', hoy: '2026-11-14' });
    const base = {
      tipo: 'riego',
      fecha: '2026-11-10',
      cantidad: 1,
      unidad: null,
      nota: null,
      luz: null,
    };
    const mensaje = (campo: string, cambios: object) => {
      const r = esquema.safeParse({ ...base, ...cambios });
      return r.success ? null : (r.error.issues.find((i) => i.path[0] === campo)?.message ?? null);
    };

    expect(mensaje('tipo', { tipo: undefined })).toBe('Elige un tipo de labor.');
    expect(mensaje('tipo', { tipo: 'otra' })).toBe('Elige un tipo de labor.');
    expect(mensaje('luz', { luz: 'lluvia' })).toBe('Elige soleado o nublado.');
    expect(mensaje('cantidad', { cantidad: undefined })).toBe('Escribe un número.');
  });
});

describe('crearLaborSchema', () => {
  const schema = crearLaborSchema({ fechaSiembra: '2026-08-16', hoy: '2026-11-14' });
  const laborValida = {
    tipo: 'riego',
    fecha: '2026-11-10',
    cantidad: 20,
    unidad: 'L',
    nota: null,
    luz: 'soleado',
  };

  it('acepta una labor válida', () => {
    expect(schema.safeParse(laborValida).success).toBe(true);
  });

  it('rechaza una labor realizada con fecha futura', () => {
    expect(camposConError(schema.safeParse({ ...laborValida, fecha: '2026-11-15' }))).toEqual([
      'fecha',
    ]);
  });

  it('acepta una labor de hoy', () => {
    expect(schema.safeParse({ ...laborValida, fecha: '2026-11-14' }).success).toBe(true);
  });

  it('rechaza una cosecha anterior a la siembra', () => {
    const resultado = schema.safeParse({ ...laborValida, tipo: 'cosecha', fecha: '2026-08-15' });

    expect(camposConError(resultado)).toEqual(['fecha']);
  });

  it('acepta una cosecha el mismo día de la siembra', () => {
    const resultado = schema.safeParse({ ...laborValida, tipo: 'cosecha', fecha: '2026-08-16' });

    expect(resultado.success).toBe(true);
  });

  it('un riego anterior a la siembra no se rechaza (la regla es solo de la cosecha)', () => {
    expect(schema.safeParse({ ...laborValida, fecha: '2026-08-01' }).success).toBe(true);
  });

  it('rechaza una cantidad negativa y acepta cero', () => {
    expect(camposConError(schema.safeParse({ ...laborValida, cantidad: -1 }))).toEqual([
      'cantidad',
    ]);
    expect(schema.safeParse({ ...laborValida, cantidad: 0 }).success).toBe(true);
  });

  it('rechaza un tipo o una luz que no existen', () => {
    expect(camposConError(schema.safeParse({ ...laborValida, tipo: 'cosechar' }))).toEqual([
      'tipo',
    ]);
    expect(camposConError(schema.safeParse({ ...laborValida, luz: 'lluvia' }))).toEqual(['luz']);
  });

  it('una fecha inexistente da un solo error y no rompe las reglas cruzadas', () => {
    const resultado = schema.safeParse({ ...laborValida, tipo: 'cosecha', fecha: '2026-02-30' });

    expect(camposConError(resultado)).toEqual(['fecha']);
  });

  it('acepta luz nula', () => {
    expect(schema.safeParse({ ...laborValida, luz: null }).success).toBe(true);
  });
});
