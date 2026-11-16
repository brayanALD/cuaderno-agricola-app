import { Appearance } from 'react-native';
import type { Esquema } from './tokens';

/** Cómo se ve la app: como el teléfono, siempre claro o siempre oscuro (D105). */
export type Apariencia = 'sistema' | 'claro' | 'oscuro';

export const APARIENCIAS: readonly Apariencia[] = ['sistema', 'claro', 'oscuro'];

export const CLAVE_APARIENCIA = 'apariencia';

export const esApariencia = (valor: unknown): valor is Apariencia =>
  APARIENCIAS.some((apariencia) => apariencia === valor);

/** El esquema que se impone, o `null` para seguir al sistema. */
export const esquemaForzado = (apariencia: Apariencia): Esquema | null => {
  if (apariencia === 'claro') return 'light';
  return apariencia === 'oscuro' ? 'dark' : null;
};

/**
 * Cambia el modo de toda la app, también el de los diálogos y calendarios nativos. Todo lo que usa
 * `useColorScheme` se vuelve a pintar solo; «auto» devuelve el control al sistema (así lo pide React Native).
 */
export function aplicarApariencia(apariencia: Apariencia): void {
  Appearance.setColorScheme(esquemaForzado(apariencia) ?? 'auto');
}

/** Dónde se guarda la elección (en el teléfono, no en la cuenta): el puerto real usa `expo-secure-store`. */
export interface AlmacenDeApariencia {
  readonly leer: () => Promise<string | null>;
  readonly guardar: (valor: string) => Promise<void>;
}

/** Lo guardado, o «sistema» si no hay nada, es ilegible o no se reconoce: nunca impide abrir la app. */
export async function leerApariencia(almacen: AlmacenDeApariencia): Promise<Apariencia> {
  try {
    const guardada = await almacen.leer();
    return esApariencia(guardada) ? guardada : 'sistema';
  } catch {
    return 'sistema';
  }
}
