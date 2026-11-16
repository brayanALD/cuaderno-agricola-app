/** Junta clases de NativeWind descartando lo que no sea texto (`false`, `undefined`, vacío). */
export const unir = (...partes: readonly (string | false | null | undefined)[]): string =>
  partes.filter((parte): parte is string => typeof parte === 'string' && parte !== '').join(' ');
