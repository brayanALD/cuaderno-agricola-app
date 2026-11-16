import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { View } from 'react-native';
import { crearCierreSchema, type DatosCierre } from '@/services/cicloService';
import type { Resultado } from '@/services/resultado';
import { FechaRapida } from '../FechaRapida';
import { Icono, type NombreIcono } from '../Icono';
import { Tarjeta } from '../Tarjeta';
import { Texto } from '../Texto';
import { CampoControlado } from './CampoControlado';
import { DisposicionDeFormulario } from './DisposicionDeFormulario';
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

const SE_CONSERVA: readonly string[] = [
  'La bitácora de labores y sus fotos',
  'La ubicación y la altitud',
  'El ciclo cerrado, en «Ciclos anteriores», con su total de kg',
];

const CAMBIA: readonly string[] = [
  'El cultivo y la fecha de siembra pasan a los nuevos',
  'La producción y los costos del lote vuelven a 0',
];

/** Una lista corta con su título: lo que le pasa al lote al cerrar el ciclo (D95, D104). */
function Resumen({
  titulo,
  icono,
  lineas,
  aviso = false,
}: {
  titulo: string;
  icono: NombreIcono;
  lineas: readonly string[];
  aviso?: boolean;
}) {
  return (
    <Tarjeta tono={aviso ? 'aviso' : 'normal'} className="gap-2">
      <View className="flex-row items-center gap-2">
        <Icono nombre={icono} tono={aviso ? 'text' : 'primary'} />
        <Texto variante="subtitulo">{titulo}</Texto>
      </View>
      {lineas.map((linea) => (
        <View key={linea} className="flex-row items-start gap-2">
          <Icono nombre={aviso ? 'arrow-forward' : 'checkmark'} tamano={16} tono="textMuted" />
          <Texto className="flex-1">{linea}</Texto>
        </View>
      ))}
    </Tarjeta>
  );
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
          <FechaRapida
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
          <FechaRapida
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
    <DisposicionDeFormulario
      textoBoton="Cerrar ciclo"
      cargando={isSubmitting}
      alGuardar={() => void guardar()}
      errorGeneral={general}
    >
      <Resumen titulo="Se conserva" icono="checkmark-circle" lineas={SE_CONSERVA} />
      <Resumen titulo="Cambia" icono="repeat" lineas={CAMBIA} aviso />
      <CamposCiclo control={control} hoy={hoy} />
    </DisposicionDeFormulario>
  );
}
