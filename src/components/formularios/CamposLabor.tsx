import { Controller, useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { View } from 'react-native';
import { LUCES, type Luz } from '@/db/modelo';
import { enCarencia, type Carencia } from '@/services/carencia';
import type { UltimasLabores } from '@/services/laborService';
import { ETIQUETA_LUZ, UNIDAD_SUGERIDA } from '@/services/etiquetas';
import { formatearFecha } from '@/services/fechas';
import { conProducto, type ValoresLabor } from '@/services/formularios';
import type { DatosLabor } from '@/services/validacion';
import { AvisoDeCarencia } from '../AvisoDeCarencia';
import { ControlCantidad } from '../ControlCantidad';
import { FechaRapida } from '../FechaRapida';
import { SeccionPlegable } from '../SeccionPlegable';
import { Selector, type OpcionSelector } from '../Selector';
import { SelectorDeTipo } from '../SelectorDeTipo';
import { SelectorDeUnidad } from '../SelectorDeUnidad';
import { CampoControlado } from './CampoControlado';
import { MedidorLuz } from './MedidorLuz';
import { RepetirUltima } from './RepetirUltima';
import { SeccionFoto } from './SeccionFoto';

const OPCIONES_LUZ: readonly OpcionSelector<Luz>[] = LUCES.map((luz) => ({
  valor: luz,
  etiqueta: ETIQUETA_LUZ[luz],
}));

type ControlLabor = Control<ValoresLabor, unknown, DatosLabor>;

interface Props {
  readonly control: ControlLabor;
  readonly setValue: UseFormSetValue<ValoresLabor>;
  readonly hoy: string;
  readonly carencia?: Carencia | null;
  readonly ultimas?: UltimasLabores;
  /** Abre «Más detalles» desde el principio (al editar una labor que ya trae luz o costo). */
  readonly detallesAbiertos?: boolean;
}

/** Al elegir un tipo se sugiere su unidad (las cosechas siempre van en kg). */
function CampoTipo({ control, setValue }: Pick<Props, 'control' | 'setValue'>) {
  return (
    <Controller
      control={control}
      name="tipo"
      render={({ field, fieldState }) => (
        <SelectorDeTipo
          valor={field.value}
          onChange={(elegido) => {
            field.onChange(elegido);
            setValue('unidad', UNIDAD_SUGERIDA[elegido]);
          }}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

/** Cantidad con su unidad al lado. En cosecha la unidad es siempre kg (fija) y el paso es de 0,5. */
function CampoCantidad({ control, setValue }: Pick<Props, 'control' | 'setValue'>) {
  const tipo = useWatch({ control, name: 'tipo' });
  const unidad = useWatch({ control, name: 'unidad' });
  const cosecha = tipo === 'cosecha';
  return (
    <Controller
      control={control}
      name="cantidad"
      render={({ field, fieldState }) => (
        <ControlCantidad
          etiqueta="Cantidad"
          valor={field.value}
          onChange={field.onChange}
          paso={cosecha ? 0.5 : 1}
          unidad={cosecha ? 'kg' : undefined}
          extra={
            cosecha ? null : (
              <SelectorDeUnidad
                valor={unidad}
                onChange={(nueva) => setValue('unidad', nueva, { shouldDirty: true })}
              />
            )
          }
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

/** Tipo, repetir la última, fecha y cantidad; y el aviso (no bloquea) si la cosecha cae en carencia. */
function CamposPrincipales({ control, setValue, hoy, carencia = null, ultimas }: Props) {
  const tipo = useWatch({ control, name: 'tipo' });
  const fecha = useWatch({ control, name: 'fecha' });
  return (
    <>
      <CampoTipo control={control} setValue={setValue} />
      {ultimas === undefined ? null : (
        <RepetirUltima control={control} setValue={setValue} ultimas={ultimas} />
      )}
      <Controller
        control={control}
        name="fecha"
        render={({ field, fieldState }) => (
          <FechaRapida
            etiqueta="Fecha de la labor"
            valor={field.value}
            onChange={field.onChange}
            hoy={hoy}
            maxima={hoy}
            error={fieldState.error?.message}
          />
        )}
      />
      <CampoCantidad control={control} setValue={setValue} />
      {tipo === 'cosecha' && carencia !== null && enCarencia(fecha, carencia) ? (
        <AvisoDeCarencia
          texto={`Esta fecha está dentro del periodo de carencia${carencia.producto === null ? '' : ` de ${carencia.producto}`}: la cosecha es segura desde el ${formatearFecha(carencia.hasta)}.`}
        />
      ) : null}
    </>
  );
}

/** Producto aplicado (fumigación y abono) y días de carencia (fumigación): solo lo que tiene sentido para el tipo (D95). */
function CamposDeInsumo({ control }: { readonly control: ControlLabor }) {
  const tipo = useWatch({ control, name: 'tipo' });
  return (
    <>
      {conProducto(tipo) ? (
        <CampoControlado
          control={control}
          name="producto"
          etiqueta="Producto aplicado (opcional)"
          maxLength={60}
        />
      ) : null}
      {tipo === 'fumigacion' ? (
        <CampoControlado
          control={control}
          name="carencia_dias"
          etiqueta="Días de carencia (opcional)"
          teclado="numeric"
          ayuda="Días que hay que esperar después de aplicar antes de cosechar."
        />
      ) : null}
    </>
  );
}

/** Foto y nota juntas: lo que se registra a diario en el campo. */
function FotoYNota({ control }: { readonly control: ControlLabor }) {
  return (
    <View className="gap-3">
      <Controller
        control={control}
        name="foto_uri"
        render={({ field }) => <SeccionFoto uri={field.value} alCambiar={field.onChange} />}
      />
      <CampoControlado
        control={control}
        name="nota"
        etiqueta="Nota (opcional)"
        multilinea
        maxLength={500}
      />
    </View>
  );
}

/** Condiciones de luz y costo, plegados: opcionales y poco frecuentes (D104). */
function MasDetalles({
  control,
  setValue,
  abierta,
}: Pick<Props, 'control' | 'setValue'> & { readonly abierta: boolean }) {
  return (
    <SeccionPlegable titulo="Más detalles" resumen="Luz y costo" abiertaAlInicio={abierta}>
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
      <CampoControlado
        control={control}
        name="costo"
        etiqueta="Costo (opcional)"
        teclado="numeric"
        ayuda="Lo que costó esta labor; suma al costo del lote y al costo por kg."
      />
    </SeccionPlegable>
  );
}

/** Todos los campos de una labor, en el orden en que se llenan. */
export function CamposLabor({
  control,
  setValue,
  hoy,
  carencia,
  ultimas,
  detallesAbiertos = false,
}: Props) {
  return (
    <>
      <CamposPrincipales
        control={control}
        setValue={setValue}
        hoy={hoy}
        carencia={carencia}
        ultimas={ultimas}
      />
      <CamposDeInsumo control={control} />
      <FotoYNota control={control} />
      <MasDetalles control={control} setValue={setValue} abierta={detallesAbiertos} />
    </>
  );
}
