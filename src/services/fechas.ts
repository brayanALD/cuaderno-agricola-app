const FORMATO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;

/** Medianoche UTC de una fecha `AAAA-MM-DD`, o `null` si no existe en el calendario. */
function diaUtc(fecha: string): number | null {
  const partes = FORMATO_FECHA.exec(fecha);
  if (partes === null) return null;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const ms = Date.UTC(anio, mes - 1, dia);
  const normalizada = new Date(ms);
  const coincide =
    normalizada.getUTCFullYear() === anio &&
    normalizada.getUTCMonth() === mes - 1 &&
    normalizada.getUTCDate() === dia;
  return coincide ? ms : null;
}

function exigirDia(fecha: string): number {
  const ms = diaUtc(fecha);
  if (ms === null) throw new RangeError(`Fecha inválida: «${fecha}». Usa AAAA-MM-DD.`);
  return ms;
}

export function esFechaValida(fecha: string): boolean {
  return diaUtc(fecha) !== null;
}

/** Días enteros de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((exigirDia(hasta) - exigirDia(desde)) / MS_POR_DIA);
}

export function sumarDias(fecha: string, dias: number): string {
  return new Date(exigirDia(fecha) + dias * MS_POR_DIA).toISOString().slice(0, 10);
}

/** Criterio de aceptación 1: un lote sembrado hace 90 días muestra «90 días». */
export function diasDesdeSiembra(fechaSiembra: string, hoy: string): number {
  return diasEntre(fechaSiembra, hoy);
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** Año, mes (1–12) y día de una fecha válida; lanza `RangeError` si no existe. */
function partes(fecha: string): readonly [number, number, number] {
  exigirDia(fecha);
  const [anio = 0, mes = 0, dia = 0] = fecha.split('-').map(Number);
  return [anio, mes, dia];
}

/** Medianoche local de una fecha `AAAA-MM-DD` (para el calendario del sistema). */
export function fechaDesdeISO(fecha: string): Date {
  const [anio, mes, dia] = partes(fecha);
  return new Date(anio, mes - 1, dia);
}

/** `2026-11-14` → «14 de noviembre de 2026»: se lee bien y TalkBack la dice natural. */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = partes(fecha);
  return `${dia} de ${MESES[mes - 1] ?? ''} de ${anio}`;
}

/** `2026-11` → «noviembre de 2026» (los meses de la producción). */
export function formatearMes(mes: string): string {
  const [anio, numero] = partes(`${mes}-01`);
  return `${MESES[numero - 1] ?? ''} de ${anio}`;
}

/** Fecha del calendario local del dispositivo (no la de UTC) como `AAAA-MM-DD`. */
export function fechaLocalISO(fecha: Date): string {
  const anio = String(fecha.getFullYear()).padStart(4, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Instante ISO → «15 de noviembre de 2026, 09:05» en el horario del teléfono (24 h). */
export function formatearFechaHora(instante: string): string {
  const fecha = new Date(instante);
  if (Number.isNaN(fecha.getTime())) throw new RangeError(`Instante inexistente: ${instante}`);
  const dia = formatearFecha(fechaLocalISO(fecha));
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  return `${dia}, ${hora}:${minutos}`;
}
