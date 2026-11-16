import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import { formatearCantidad } from '@/services/cantidad';
import { ETIQUETA_TIPO } from '@/services/etiquetas';
import { valoresDesdeLabor, type ValoresLabor } from '@/services/formularios';
import type { UltimasLabores } from '@/services/laborService';
import type { DatosLabor } from '@/services/validacion';
import { Boton } from '../Boton';
import { Texto } from '../Texto';

interface Props {
  readonly control: Control<ValoresLabor, unknown, DatosLabor>;
  readonly setValue: UseFormSetValue<ValoresLabor>;
  readonly ultimas: UltimasLabores;
}

/**
 * Registro rápido (D100): si ya se hizo una labor de este tipo, ofrece repetirla. Copia cantidad, unidad,
 * producto, días de carencia y costo; NO la fecha (queda la elegida), la nota, la luz ni la foto: eso es de cada
 * día. Solo rellena el formulario: el usuario revisa y registra.
 */
export function RepetirUltima({ control, setValue, ultimas }: Props) {
  const tipo = useWatch({ control, name: 'tipo' });
  const ultima = ultimas[tipo];
  if (ultima === undefined) return null;
  const nombre = ETIQUETA_TIPO[tipo].toLowerCase();
  const cantidad =
    ultima.cantidad > 0
      ? `${formatearCantidad(ultima.cantidad)} ${ultima.unidad ?? ''}`.trim()
      : null;

  const repetir = () => {
    const valores = valoresDesdeLabor(ultima);
    const campos = ['cantidad', 'unidad', 'producto', 'carencia_dias', 'costo'] as const;
    for (const campo of campos) setValue(campo, valores[campo], { shouldDirty: true });
  };

  return (
    <>
      <Boton
        titulo={`Repetir la última de ${nombre}`}
        icono="repeat-outline"
        variante="tonal"
        onPress={repetir}
      />
      {cantidad === null ? null : (
        <Texto variante="ayuda">
          Última de {nombre}: {cantidad}
        </Texto>
      )}
    </>
  );
}
