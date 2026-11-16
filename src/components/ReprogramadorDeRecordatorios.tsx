import { useReprogramarRecordatorios } from '@/hooks/useRecordatorios';

/** No pinta nada: mantiene al día los avisos de riego mientras la app está abierta (D90). */
export function ReprogramadorDeRecordatorios() {
  useReprogramarRecordatorios();
  return null;
}
