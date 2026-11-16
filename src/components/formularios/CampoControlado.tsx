import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';
import { CampoTexto, type CampoTextoProps } from '../CampoTexto';

type PropsPropias<TValores extends FieldValues, TTransformado> = {
  readonly control: Control<TValores, unknown, TTransformado>;
  readonly name: Path<TValores>;
} & Omit<CampoTextoProps, 'valor' | 'onChangeText' | 'onBlur' | 'error'>;

/** `CampoTexto` conectado a react-hook-form: valor, cambios, pérdida de foco y error. */
export function CampoControlado<TValores extends FieldValues, TTransformado>({
  control,
  name,
  ...resto
}: PropsPropias<TValores, TTransformado>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <CampoTexto
      {...resto}
      valor={String(field.value ?? '')}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}
