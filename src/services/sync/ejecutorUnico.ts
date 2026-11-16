/**
 * Convierte `tarea` en algo que nunca corre dos veces a la vez. Lo que se pida mientras corre se junta
 * en UNA ejecución más (no una por petición): así tres cambios seguidos no lanzan tres sincronizaciones.
 * La promesa devuelta termina cuando acaba también esa ejecución repetida.
 */
export function crearEjecutorUnico(tarea: () => Promise<void>): () => Promise<void> {
  let enCurso: Promise<void> | null = null;
  let repetir = false;

  async function ciclo(): Promise<void> {
    do {
      repetir = false;
      await tarea();
    } while (repetir);
  }

  return () => {
    if (enCurso !== null) {
      repetir = true;
      return enCurso;
    }
    enCurso = ciclo().finally(() => {
      enCurso = null;
    });
    return enCurso;
  };
}
