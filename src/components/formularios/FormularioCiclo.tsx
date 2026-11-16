import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { View } from 'react-native';
import { crearCierreSchema, type DatosCierre } from '@/services/cicloService';
import type { Resultado } from '@/services/resultado';
import { Boton } from '../Boton';
import { CampoFecha } from '../CampoFecha';
import { MensajeError } from '../MensajeError';
import { CampoControlado } from './CampoControlado';
import { aplicarErrores } from './errores';

const CAMPOS = ['fecha_fin', 'cultivo', 'fecha_siembra'] as const;

export interface FormularioCicloProps {
  /** Siembra del ciclo que se cierra: el cierre no puede ser anterior. */
  readonly fechaSiembra: string;
  readonly cultivoActual: string;
  readonly hoy: string;
  readonly alGuardar: (datos: DatosCierre) => Promise<Resultado<unknown>>;
  readonly alTerminar: () => void;
}

/** Fin del ciclo actual y cultivo y siembra del siguiente. */
function CamposCiclo({
  control,
  hoy,
}: {
  readonly control: Control<DatosCierre, unknown, DatosCierre>;
  readonly hoy: string;
}) {
  return (
    <>
      <Controller
        control={control}
        name="fecha_fin"
        render={({ field, fieldState }) => (
          <CampoFecha
            etiqueta="Fin del ciclo actual"
            valor={field.value}
            onChange={field.onChange}
            hoy={hoy}
            maxima={hoy}
            error={fieldState.error?.message}
          />
        )}
      />
      <CampoControlado control={control} name="cultivo" etiqueta="Cultivo del nuevo ciclo" />
      <Controller
        control={control}
        name="fecha_siembra"
        render={({ field, fieldState }) => (
          <CampoFecha
            etiqueta="Siembra del nuevo ciclo"
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

/** Cierra el ciclo en curso y pide el cultivo y la siembra del siguiente (D95). */
export function FormularioCiclo({
  fechaSiembra,
  cultivoActual,
  hoy,
  alGuardar,
  alTerminar,
}: FormularioCicloProps) {
  const esquema = useMemo(() => crearCierreSchema({ fechaSiembra, hoy }), [fechaSiembra, hoy]);
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<DatosCierre, unknown, DatosCierre>({
    defaultValues: { fecha_fin: hoy, cultivo: cultivoActual, fecha_siembra: hoy },
    resolver: zodResolver(esquema),
  });
  const [general, setGeneral] = useState<string | null>(null);

  const guardar = handleSubmit(async (datos) => {
    const resultado = await alGuardar(datos);
    if (resultado.ok) alTerminar();
    else setGeneral(aplicarErrores(resultado.errores, setError, CAMPOS));
  });

  return (
    <View className="gap-4">
      <CamposCiclo control={control} hoy={hoy} />
      <MensajeError texto={general ?? undefined} />
      <Boton titulo="Cerrar ciclo" cargando={isSubmitting} onPress={() => void guardar()} />
    </View>
  );
}
