/**
 * Lo único que la app necesita saber de la conexión (D72): si hay internet y cuándo vuelve. El adaptador
 * real usa `expo-network`; «hay red» no garantiza que la API responda, así que los fallos de red de
 * las peticiones se tratan igual.
 */
export interface MonitorRed {
  /** Estado de la conexión ahora mismo. */
  readonly actual: () => Promise<boolean>;
  /** Avisa de cada cambio de estado; devuelve la función para darse de baja. */
  readonly suscribir: (oyente: (conectado: boolean) => void) => () => void;
}
