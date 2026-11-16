import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * Número que sube cada vez que la pantalla pierde el foco (se abre otra encima o se cierra). Úsalo como
 * `key` de un formulario para que empiece limpio al volver: en una pila de navegación la pantalla de
 * debajo sigue montada con lo que se había escrito, incluida la contraseña (H8).
 */
export function useReiniciarAlSalir(): number {
  const [vez, setVez] = useState(0);
  useFocusEffect(useCallback(() => () => setVez((anterior) => anterior + 1), []));
  return vez;
}
