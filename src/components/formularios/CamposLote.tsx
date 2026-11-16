import { Controller, type Control } from 'react-hook-form';
import type { ValoresLote } from '@/services/formularios';
import type { DatosLote } from '@/services/validacion';
import { CampoFecha } from '../CampoFecha';
import { CampoControlado } from './CampoControlado';

interface Props {
  readonly control: Control<ValoresLote, unknown, DatosLote>;
  readonly hoy: string;
}

/** Nombre, cultivo, área y fecha de siembra (la ubicación va aparte). */
export function CamposLote({ control, hoy }: Props) {
  return (
    <>
      <CampoControlado control={control} name="nombre" etiqueta="Nombre del lote" />
      <CampoControlado control={control} name="cultivo" etiqueta="Cultivo" />
      <CampoControlado
        control={control}
        name="finca"
        etiqueta="Finca (opcional)"
        ayuda="Sirve para agrupar y buscar los lotes de una misma finca."
        maxLength={60}
      />
      <CampoControlado
        control={control}
        name="area_m2"
        etiqueta="Área (m²)"
        teclado="numeric"
        ayuda="Número entero de metros cuadrados, mayor que 0."
      />
      <Controller
        control={control}
        name="fecha_siembra"
        render={({ field, fieldState }) => (
          <CampoFecha
            etiqueta="Fecha de siembra"
            valor={field.value}
            onChange={field.onChange}
            hoy={hoy}
            maxima={hoy}
            error={fieldState.error?.message}
          />
        )}
      />
    </>
  );
}
