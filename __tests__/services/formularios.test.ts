import {
  aDatosLabor,
  aDatosLote,
  crearEsquemaFormularioLabor,
  esquemaFormularioLote,
  valoresDesdeLabor,
  valoresDesdeLote,
  valoresLaborVacios,
  valoresLoteVacios,
} from '@/services/formularios';
import { laborFila, loteFila } from '../helpers/filas';

const escrito = {
  nombre: 'El Mirador',
  cultivo: 'Café',
  finca: '',
  area_m2: '5000',
  altitud_m: '1650,5',
  lat: '4,65',
  lng: '-75.57',
  fecha_siembra: '2026-08-16',
};

describe('aDatosLote', () => {
  it('convierte el texto escrito en números (coma o punto decimal)', () => {
    expect(aDatosLote(escrito)).toEqual({
      nombre: 'El Mirador',
      cultivo: 'Café',
      area_m2: 5000,
      altitud_m: 1650.5,
      lat: 4.65,
      lng: -75.57,
      fecha_siembra: '2026-08-16',
      finca: '',
    });
  });

  it('altitud, latitud y longitud vacías son null (se pueden dejar sin medir)', () => {
    const datos = aDatosLote({ ...escrito, altitud_m: ' ', lat: '', lng: '' });

    expect(datos).toMatchObject({ altitud_m: null, lat: null, lng: null });
  });

  it('el área vacía o no numérica queda como NaN para que el esquema la rechace', () => {
    expect(aDatosLote({ ...escrito, area_m2: '' }).area_m2).toBeNaN();
    expect(aDatosLote({ ...escrito, area_m2: 'abc' }).area_m2).toBeNaN();
  });
});

describe('valoresLoteVacios y valoresDesdeLote', () => {
  it('un lote nuevo empieza vacío, sembrado hoy', () => {
    expect(valoresLoteVacios('2026-11-14')).toEqual({
      nombre: '',
      cultivo: '',
      finca: '',
      area_m2: '',
      altitud_m: '',
      lat: '',
      lng: '',
      fecha_siembra: '2026-11-14',
    });
  });

  it('un lote guardado se muestra como texto, con vacío donde hay null', () => {
    expect(
      valoresDesdeLote(loteFila({ altitud_m: null, lat: null, lng: null, area_m2: 7000 })),
    ).toEqual({
      nombre: 'El Mirador',
      cultivo: 'Café',
      finca: '',
      area_m2: '7000',
      altitud_m: '',
      lat: '',
      lng: '',
      fecha_siembra: '2026-08-16',
    });
  });

  it('ida y vuelta: lo que se muestra se vuelve a convertir igual', () => {
    const lote = loteFila();

    expect(aDatosLote(valoresDesdeLote(lote))).toMatchObject({
      area_m2: lote.area_m2,
      altitud_m: lote.altitud_m,
      lat: lote.lat,
      lng: lote.lng,
    });
  });
});

describe('esquemaFormularioLote (react-hook-form + zod)', () => {
  it('acepta lo escrito si es válido y entrega los datos ya convertidos', () => {
    const resultado = esquemaFormularioLote.safeParse(escrito);

    expect(resultado.success && resultado.data).toMatchObject({ area_m2: 5000, altitud_m: 1650.5 });
  });

  it('rechaza con mensajes en español, uno por campo', () => {
    const resultado = esquemaFormularioLote.safeParse({
      ...escrito,
      nombre: ' ',
      area_m2: '',
      altitud_m: '7000',
    });
    const mensajes = resultado.success
      ? {}
      : Object.fromEntries(resultado.error.issues.map((i) => [String(i.path[0]), i.message]));

    expect(mensajes).toEqual({
      nombre: 'Este campo es obligatorio.',
      area_m2: 'Escribe un número.',
      altitud_m: 'La altitud máxima es 6000 m.',
    });
  });
});

describe('formulario de labor', () => {
  const escritoLabor = {
    tipo: 'riego',
    fecha: '2026-11-10',
    cantidad: 20,
    unidad: 'L',
    nota: 'Goteo',
    luz: 'soleado',
    foto_uri: null,
    producto: '',
    carencia_dias: '',
    costo: '',
  } as const;

  it('una labor nueva empieza en riego, de hoy, con la unidad sugerida y sin luz ni foto', () => {
    expect(valoresLaborVacios('2026-11-14')).toEqual({
      tipo: 'riego',
      fecha: '2026-11-14',
      cantidad: 0,
      unidad: 'L',
      nota: '',
      luz: null,
      foto_uri: null,
      producto: '',
      carencia_dias: '',
      costo: '',
    });
  });

  it('aDatosLabor deja unidad y nota vacías como null y recorta espacios', () => {
    expect(aDatosLabor({ ...escritoLabor, unidad: '  ', nota: '' })).toMatchObject({
      unidad: null,
      nota: null,
    });
    expect(aDatosLabor({ ...escritoLabor, nota: '  Goteo  ' })).toMatchObject({ nota: 'Goteo' });
  });

  it('valoresDesdeLabor muestra una labor guardada como valores del formulario', () => {
    expect(
      valoresDesdeLabor(
        laborFila({
          tipo: 'cosecha',
          cantidad: 12.5,
          unidad: 'kg',
          nota: null,
          luz: 'nublado',
          foto_uri: 'file:///f.jpg',
        }),
      ),
    ).toEqual({
      tipo: 'cosecha',
      fecha: '2026-11-10',
      cantidad: 12.5,
      unidad: 'kg',
      nota: '',
      producto: '',
      carencia_dias: '',
      costo: '',
      luz: 'nublado',
      foto_uri: 'file:///f.jpg',
    });
  });

  it('el esquema aplica las reglas de la labor (fecha futura, cosecha antes de la siembra)', () => {
    const esquema = crearEsquemaFormularioLabor({ fechaSiembra: '2026-08-16', hoy: '2026-11-14' });
    const mensajeDeFecha = (fecha: string, tipo: 'riego' | 'cosecha' = 'riego') => {
      const r = esquema.safeParse({ ...escritoLabor, tipo, fecha });
      return r.success ? null : r.error.issues[0]?.message;
    };

    expect(esquema.safeParse(escritoLabor).success).toBe(true);
    expect(mensajeDeFecha('2026-11-15')).toBe('Una labor realizada no puede tener fecha futura.');
    expect(mensajeDeFecha('2026-08-15', 'cosecha')).toBe(
      'La cosecha no puede ser anterior a la siembra.',
    );
  });

  it('el esquema rechaza una cantidad negativa', () => {
    const esquema = crearEsquemaFormularioLabor({ fechaSiembra: '2026-08-16', hoy: '2026-11-14' });

    const resultado = esquema.safeParse({ ...escritoLabor, cantidad: -1 });

    expect(resultado.success ? null : resultado.error.issues[0]?.message).toBe(
      'La cantidad no puede ser negativa.',
    );
  });
});

describe('campos de cuaderno agrícola en los formularios (D95)', () => {
  const base = {
    tipo: 'fumigacion',
    fecha: '2026-11-10',
    cantidad: 8,
    unidad: 'L',
    nota: '',
    luz: null,
    foto_uri: null,
    producto: ' Mancozeb ',
    carencia_dias: '21',
    costo: '35000,5',
  } as const;

  it('la finca escrita viaja tal cual y se muestra la guardada', () => {
    expect(aDatosLote({ ...escrito, finca: 'La Aurora' }).finca).toBe('La Aurora');
    expect(valoresDesdeLote(loteFila({ finca: 'La Aurora' })).finca).toBe('La Aurora');
  });

  it('una fumigación lleva producto, días de carencia y costo (coma decimal)', () => {
    expect(aDatosLabor(base)).toMatchObject({
      producto: ' Mancozeb ',
      carencia_dias: 21,
      costo: 35000.5,
    });
  });

  it('vacíos son null', () => {
    expect(aDatosLabor({ ...base, carencia_dias: '', costo: ' ' })).toMatchObject({
      carencia_dias: null,
      costo: null,
    });
  });

  it('el abono conserva el producto pero no la carencia; el riego, ninguno de los dos', () => {
    expect(aDatosLabor({ ...base, tipo: 'abono' })).toMatchObject({
      producto: ' Mancozeb ',
      carencia_dias: null,
    });
    expect(aDatosLabor({ ...base, tipo: 'riego' })).toMatchObject({
      producto: null,
      carencia_dias: null,
      costo: 35000.5,
    });
  });

  it('una labor guardada muestra sus datos como texto', () => {
    const valores = valoresDesdeLabor(
      laborFila({ tipo: 'fumigacion', producto: 'Mancozeb', carencia_dias: 21, costo: 35000 }),
    );

    expect([valores.producto, valores.carencia_dias, valores.costo]).toEqual([
      'Mancozeb',
      '21',
      '35000',
    ]);
  });
});
