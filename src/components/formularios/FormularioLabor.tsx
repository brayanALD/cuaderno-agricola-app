import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { crearEsquemaFormularioLabor, type ValoresLabor } from '@/services/formularios';
import type { Carencia } from '@/services/carencia';
import type { UltimasLabores } from '@/services/laborService';
import type { Resultado } from '@/services/resultado';
import type { DatosLabor } from '@/services/validacion';
import { ContextoDeLote } from '../ContextoDeLote';
import { CamposLabor } from './CamposLabor';
import { DisposicionDeFormulario } from './DisposicionDeFormulario';
import { aplicarErrores } from './errores';

const CAMPOS = [
  'tipo',
  'fecha',
  'cantidad',
  'unidad',
  'nota',
  'luz',
  'foto_uri',
  'producto',
  'carencia_dias',
  'costo',
] as const;

export interface FormularioLaborProps {
  /** Fecha de siembra del lote: la cosecha no puede ser anterior (sección 7). */
  readonly fechaSiembra: string;
  readonly valoresIniciales: ValoresLabor;
  readonly hoy: string;
  /** Periodo de carencia del lote: si la cosecha cae dentro, se avisa (no se impide) (D95). */
  readonly carencia?: Carencia | null;
  /** Última labor de cada tipo: solo al registrar una nueva, para ofrecer repetirla (D100). */
  readonly ultimas?: UltimasLabores;
  /** El lote en el que se trabaja, para mostrarlo arriba. */
  readonly lote?: { readonly nombre: string; readonly cultivo: string };
  readonly textoBoton: string;
  readonly alGuardar: (datos: DatosLabor) => Promise<Resultado<unknown>>;
  readonly alTerminar: () => void;
}

type Envio = Pick<
  FormularioLaborProps,
  'fechaSiembra' | 'valoresIniciales' | 'hoy' | 'alGuardar' | 'alTerminar'
>;

/** El formulario (react-hook-form + zod, D30) y su envío: los errores del servicio caen en su campo o salen como general. */
function useFormularioLabor({ fechaSiembra, valoresIniciales, hoy, alGuardar, alTerminar }: Envio) {
  const esquema = useMemo(
    () => crearEsquemaFormularioLabor({ fechaSiembra, hoy }),
    [fechaSiembra, hoy],
  );
  const formulario = useForm<ValoresLabor, unknown, DatosLabor>({
    defaultValues: valoresIniciales,
    resolver: zodResolver(esquema),
  });
  const [general, setGeneral] = useState<string | null>(null);
  const guardar = formulario.handleSubmit(async (datos) => {
    const resultado = await alGuardar(datos);
    if (resultado.ok) {
      alTerminar();
      return;
    }
    setGeneral(aplicarErrores(resultado.errores, formulario.setError, CAMPOS));
  });
  return { formulario, guardar, general };
}

/**
 * Crea o edita una labor con las reglas de la sección 7 y los errores del servicio en su campo. El botón de
 * guardar queda fijo abajo (siempre al alcance del pulgar, Fitts) y el formulario se desplaza encima (D104).
 */
export function FormularioLabor(props: FormularioLaborProps) {
  const { hoy, carencia = null, ultimas, lote, textoBoton, valoresIniciales } = props;
  const { formulario, guardar, general } = useFormularioLabor(props);
  const { control, setValue } = formulario;
  return (
    <DisposicionDeFormulario
      textoBoton={textoBoton}
      cargando={formulario.formState.isSubmitting}
      alGuardar={() => void guardar()}
      errorGeneral={general}
    >
      {lote ? <ContextoDeLote nombre={lote.nombre} cultivo={lote.cultivo} /> : null}
      <CamposLabor
        control={control}
        setValue={setValue}
        hoy={hoy}
        carencia={carencia}
        ultimas={ultimas}
        detallesAbiertos={valoresIniciales.luz !== null || valoresIniciales.costo !== ''}
      />
    </DisposicionDeFormulario>
  );
}
