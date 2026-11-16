import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { esquemaFormularioLote, type ValoresLote } from '@/services/formularios';
import type { Resultado } from '@/services/resultado';
import type { DatosLote } from '@/services/validacion';
import { CamposLote } from './CamposLote';
import { DisposicionDeFormulario } from './DisposicionDeFormulario';
import { aplicarErrores } from './errores';
import { SeccionUbicacion } from './SeccionUbicacion';

const CAMPOS = [
  'nombre',
  'cultivo',
  'finca',
  'area_m2',
  'altitud_m',
  'lat',
  'lng',
  'fecha_siembra',
] as const;

export interface FormularioLoteProps {
  readonly valoresIniciales: ValoresLote;
  readonly hoy: string;
  readonly textoBoton: string;
  readonly alGuardar: (datos: DatosLote) => Promise<Resultado<unknown>>;
  readonly alTerminar: () => void;
}

/** Crea o edita un lote: validación con zod y, al guardar, los errores del servicio en su campo. */
export function FormularioLote({
  valoresIniciales,
  hoy,
  textoBoton,
  alGuardar,
  alTerminar,
}: FormularioLoteProps) {
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { isSubmitting },
  } = useForm<ValoresLote, unknown, DatosLote>({
    defaultValues: valoresIniciales,
    resolver: zodResolver(esquemaFormularioLote),
  });
  const [general, setGeneral] = useState<string | null>(null);

  const guardar = handleSubmit(async (datos) => {
    const resultado = await alGuardar(datos);
    if (resultado.ok) {
      alTerminar();
      return;
    }
    setGeneral(aplicarErrores(resultado.errores, setError, CAMPOS));
  });

  return (
    <DisposicionDeFormulario
      textoBoton={textoBoton}
      cargando={isSubmitting}
      alGuardar={() => void guardar()}
      errorGeneral={general}
    >
      <CamposLote control={control} hoy={hoy} />
      <SeccionUbicacion control={control} setValue={setValue} />
    </DisposicionDeFormulario>
  );
}
