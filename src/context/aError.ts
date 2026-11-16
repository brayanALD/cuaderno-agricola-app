/** Lo que se lanza o rechaza puede no ser un `Error`: se normaliza para mostrar su mensaje. */
export const aError = (valor: unknown): Error =>
  valor instanceof Error ? valor : new Error(String(valor));
