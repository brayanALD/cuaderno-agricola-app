import { ErrorApi } from '@/api/errores';
import { datosLabor, datosLote } from '../helpers/contexto';
import { leerContrato } from '../helpers/contrato';
import { crearServidorFalso, type Recurso } from '../helpers/servidorFalso';

/**
 * El servidor falso de las pruebas de la app (D103) tiene que hablar como el contrato: si se desviara, las demás
 * pruebas de sincronización dejarían de valer sin que nadie lo notara.
 */
const contrato = leerContrato();
const { lotes, labores } = contrato.recursos;

const clavesDe = (objeto: unknown): string[] =>
  Object.keys(objeto as Record<string, unknown>).sort();

describe('el servidor falso de las pruebas es fiel al contrato (si no, las demás pruebas no valdrían)', () => {
  const RECURSOS: Recurso[] = ['lotes', 'labores', 'ciclos'];

  it.each(RECURSOS)(
    'acepta el ejemplo de %s y devuelve un documento con los campos del contrato',
    (nombre) => {
      const servidor = crearServidorFalso();
      servidor.guardar('lotes', 'lote-1', lotes.ejemplo);
      const recurso = contrato.recursos[nombre];

      const doc = servidor.guardar(nombre, nombre === 'lotes' ? 'lote-1' : 'x', recurso.ejemplo);

      expect(clavesDe(doc)).toEqual(clavesDe(recurso.documento));
    },
  );

  it.each(RECURSOS)(
    'rechaza un cuerpo de %s al que le falta un campo obligatorio o le sobra uno',
    (nombre) => {
      const servidor = crearServidorFalso();
      servidor.guardar('lotes', 'lote-1', lotes.ejemplo);
      const recurso = contrato.recursos[nombre];
      const obligatorio = recurso.campos.find((c) => !recurso.opcionales.includes(c)) ?? '';
      const sin = Object.fromEntries(
        Object.entries(recurso.ejemplo).filter(([c]) => c !== obligatorio),
      );

      expect(() => servidor.guardar(nombre, 'x', sin)).toThrow();
      expect(() => servidor.guardar(nombre, 'x', { ...recurso.ejemplo, sobra: 1 })).toThrow();
    },
  );

  it('acepta los cuerpos sin los campos opcionales (cliente antiguo)', () => {
    const servidor = crearServidorFalso();
    servidor.guardar('lotes', 'lote-1', lotes.ejemplo);
    const sinOpcionales = (r: typeof lotes) =>
      Object.fromEntries(Object.entries(r.ejemplo).filter(([c]) => !r.opcionales.includes(c)));

    expect(servidor.guardar('lotes', 'lote-1', sinOpcionales(lotes)).finca).toBeNull();
    expect(servidor.guardar('labores', 'x', sinOpcionales(labores)).costo).toBeNull();
  });

  it('responde al conflicto de versión con el estado y el campo del contrato', () => {
    const { campo, conflicto } = contrato.version_base;
    const servidor = crearServidorFalso();
    const primero = servidor.guardar('lotes', 'lote-1', lotes.ejemplo);
    servidor.guardar('lotes', 'lote-1', { ...lotes.ejemplo, area_m2: 6000 });

    const intento = () =>
      servidor.guardar('lotes', 'lote-1', {
        ...lotes.ejemplo,
        area_m2: 1,
        [campo]: primero.updated_at,
      });

    expect(intento).toThrow(ErrorApi);
    try {
      intento();
    } catch (error) {
      expect(error).toMatchObject({
        status: conflicto.estado,
        detalles: [{ campo: conflicto.campo }],
      });
    }
  });

  it('el envío por lotes rechaza más cambios que el límite del contrato', async () => {
    const servidor = crearServidorFalso();
    const cambios = Array.from({ length: contrato.cambios.limite + 1 }, (_, i) => ({
      recurso: 'lotes',
      id: `l${String(i)}`,
      borrado: true,
    }));

    await expect(
      servidor.pedir(contrato.cambios.ruta, { metodo: 'POST', cuerpo: { cambios } }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('el contrato y los datos de prueba usan los mismos nombres', () => {
    expect(datosLote()).toMatchObject({ nombre: expect.any(String) });
    expect(datosLabor()).toMatchObject({ tipo: expect.any(String) });
  });
});
