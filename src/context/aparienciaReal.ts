import * as SecureStore from 'expo-secure-store';
import { CLAVE_APARIENCIA, type AlmacenDeApariencia } from '@/theme/apariencia';

/**
 * La apariencia se guarda en el teléfono con `expo-secure-store` (ya es una dependencia): es del dispositivo, no de
 * la cuenta, y se necesita antes de abrir la base de datos de cualquier usuario. Solo se prueba en el teléfono.
 */
export const almacenDeAparienciaReal: AlmacenDeApariencia = {
  leer: () => SecureStore.getItemAsync(CLAVE_APARIENCIA),
  guardar: (valor) => SecureStore.setItemAsync(CLAVE_APARIENCIA, valor),
};
