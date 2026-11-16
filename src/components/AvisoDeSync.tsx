import { View } from 'react-native';
import { Icono } from './Icono';
import { Texto } from './Texto';

/**
 * Por qué el servidor no aceptó un lote o una labor (D73). No es una alerta que interrumpa: se lee con
 * el elemento al que acompaña y desaparece al corregirlo (editarlo lo vuelve a enviar).
 */
export function AvisoDeSync({ mensaje }: { readonly mensaje: string | null }) {
  if (mensaje === null) return null;
  const texto = `Sin sincronizar: ${mensaje}`;
  return (
    <View accessible accessibilityLabel={texto} className="flex-row items-start gap-2">
      <Icono nombre="cloud-offline-outline" tamano={18} tono="danger" />
      <Texto variante="error" className="flex-1">
        {texto}
      </Texto>
    </View>
  );
}
