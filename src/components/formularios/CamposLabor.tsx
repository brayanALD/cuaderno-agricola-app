import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { TIPOS_LABOR, type Luz, type TipoLabor } from '@/db/modelo';
import { ETIQUETA_LUZ, ETIQUETA_TIPO, UNIDAD_SUGERIDA } from '@/services/etiquetas';
import type { ValoresLabor } from '@/services/formularios';
import type { DatosLabor } from '@/services/validacion';
import { CampoFecha } from '../CampoFecha';
import { ControlCantidad } from '../ControlCantidad';
import { Selector, type OpcionSelector } from '../Selector';
import { CampoControlado } from './CampoControlado';
import { MedidorLuz } from './MedidorLuz';
import { SeccionFoto } from './SeccionFoto';

const OPCIONES_TIPO: readonly OpcionSelector<TipoLabor>[] = TIPOS_LABOR.map((tipo) => ({
  valor: tipo,
  etiqueta: ETIQUETA_TIPO[tipo],
}));

const OPCIONES_LUZ: readonly OpcionSelector<Luz>[] = (['soleado', 'nublado'] as const).map(
  (luz) => ({ valor: luz, etiqueta: ETIQUETA_LUZ[luz] }),
);

type ControlLabor = Control<ValoresLabor, unknown, DatosLabor>;

interface Props {
  readonly control: ControlLabor;
  readonly setValue: UseFormSetValue<ValoresLabor>;
  readonly hoy: string;
}

/** Al elegir un tipo se sugiere su unidad (las cosechas siempre van en kg). */
function SelectorDeTipo({ control, setValue }: Omit<Props, 'hoy'>) {
  return (
    <Controller
      control={control}
      name="tipo"
      render={({ field, fieldState }) => (
        <Selector
          etiqueta="Tipo de labor"
          opciones={OPCIONES_TIPO}
          valor={field.value}
          onChange={(elegido) => {
            if (elegido === null) return;
            field.onChange(elegido);
            setValue('unidad', UNIDAD_SUGERIDA[elegido]);
          }}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

/** Tipo, fecha, cantidad y unidad. En cosecha la unidad es siempre kg y el paso es de 0,5. */
function CamposPrincipales({ control, setValue, hoy }: Props) {
  const tipo = useWatch({ control, name: 'tipo' });
  const unidad = useWatch({ control, name: 'unidad' });
  return (
    <>
      <SelectorDeTipo control={control} setValue={setValue} />
      <Controller
        control={control}
        name="fecha"
        render={({ field, fieldState }) => (
          <CampoFecha
            etiqueta="Fecha de la labor"
            valor={field.value}
            onChange={field.onChange}
            hoy={hoy}
            maxima={hoy}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="cantidad"
        render={({ field, fieldState }) => (
          <ControlCantidad
            etiqueta="Cantidad"
            valor={field.value}
            onChange={field.onChange}
            paso={tipo === 'cosecha' ? 0.5 : 1}
            unidad={tipo === 'cosecha' ? 'kg' : unidad}
            error={fieldState.error?.message}
          />
        )}
      />
      {tipo === 'cosecha' ? null : (
        <CampoControlado control={control} name="unidad" etiqueta="Unidad" />
      )}
    </>
  );
}

/** Nota, condiciones de luz y foto: todo opcional. */
function CamposOpcionales({
  control,
  setValue,
}: {
  readonly control: ControlLabor;
  readonly setValue: UseFormSetValue<ValoresLabor>;
}) {
  return (
    <>
      <CampoControlado
        control={control}
        name="nota"
        etiqueta="Nota (opcional)"
        multilinea
        maxLength={500}
      />
      <Controller
        control={control}
        name="luz"
        render={({ field, fieldState }) => (
          <Selector
            etiqueta="Condiciones de luz (opcional)"
            opciones={OPCIONES_LUZ}
            valor={field.value}
            onChange={field.onChange}
            permitirVacio
            error={fieldState.error?.message}
          />
        )}
      />
      <MedidorLuz alMedir={(luz) => setValue('luz', luz, { shouldDirty: true })} />
      <Controller
        control={control}
        name="foto_uri"
        render={({ field }) => <SeccionFoto uri={field.value} alCambiar={field.onChange} />}
      />
    </>
  );
}

/** Todos los campos de una labor. */
export function CamposLabor({ control, setValue, hoy }: Props) {
  return (
    <>
      <CamposPrincipales control={control} setValue={setValue} hoy={hoy} />
      <CamposOpcionales control={control} setValue={setValue} />
    </>
  );
}
