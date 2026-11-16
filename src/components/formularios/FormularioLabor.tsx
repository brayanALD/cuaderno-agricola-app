import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { crearEsquemaFormularioLabor, type ValoresLabor } from '@/services/formularios';
import type { Resultado } from '@/services/resultado';
import type { DatosLabor } from '@/services/validacion';
import { Boton } from '../Boton';
import { MensajeError } from '../MensajeError';
import { CamposLabor } from './CamposLabor';
import { aplicarErrores } from './errores';

const CAMPOS = ['tipo', 'fecha', 'cantidad', 'unidad', 'nota', 'luz', 'foto_uri'] as const;

export interface FormularioLaborProps {
  /** Fecha de siembra del lote: la cosecha no puede ser anterior (sección 7). */
  readonly fechaSiembra: string;
  readonly valoresIniciales: ValoresLabor;
  readonly hoy: string;
  readonly textoBoton: string;
  readonly alGuardar: (datos: DatosLabor) => Promise<Resultado<unknown>>;
  readonly alTerminar: () => void;
}

/** Crea o edita una labor con las reglas de la sección 7 y los errores del servicio en su campo. */
export function FormularioLabor({
  fechaSiembra,
  valoresIniciales,
  hoy,
  textoBoton,
  alGuardar,
  alTerminar,
}: FormularioLaborProps) {
  const esquema = useMemo(
    () => crearEsquemaFormularioLabor({ fechaSiembra, hoy }),
    [fechaSiembra, hoy],
  );
  const {
    control,
    handleSubmit,
    setValue,
    setError,
    formState: { isSubmitting },
  } = useForm<ValoresLabor, unknown, DatosLabor>({
    defaultValues: valoresIniciales,
    resolver: zodResolver(esquema),
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
    <View className="gap-4">
      <CamposLabor control={control} setValue={setValue} hoy={hoy} />
      <MensajeError texto={general ?? undefined} />
      <Boton titulo={textoBoton} cargando={isSubmitting} onPress={() => void guardar()} />
    </View>
  );
}
