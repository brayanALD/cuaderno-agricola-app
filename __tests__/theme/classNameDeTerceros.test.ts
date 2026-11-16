import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Todos los `.tsx` de las carpetas dadas (la app y su código fuente). */
function archivosTsx(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosTsx(ruta);
    return ruta.endsWith('.tsx') ? [ruta] : [];
  });
}

const RAIZ = join(__dirname, '..', '..');

describe('className en componentes de terceros (NativeWind v5)', () => {
  /**
   * NativeWind v5 solo traduce `className` en los componentes de `react-native`. Un componente de otra
   * librería lo ignora en silencio (en el teléfono: pantalla en blanco) y Jest no lo nota porque no
   * calcula estilos. Ese componente debe pasar por `styled(...)` antes de recibir `className`.
   */
  it('`SafeAreaView` de safe-area-context nunca recibe `className` sin pasar por `styled`', () => {
    const infractores = [
      ...archivosTsx(join(RAIZ, 'src')),
      ...archivosTsx(join(RAIZ, 'app')),
    ].filter((ruta) => /<SafeAreaView[^>]*className/s.test(readFileSync(ruta, 'utf8')));

    expect(infractores).toEqual([]);
  });

  it('`Pantalla` envuelve el `SafeAreaView` con `styled`', () => {
    const fuente = readFileSync(join(RAIZ, 'src', 'components', 'Pantalla.tsx'), 'utf8');

    expect(fuente).toMatch(/styled\(SafeAreaView\)/);
  });
});
