import { View } from 'react-native';
import { Icono } from './Icono';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

/** En qué lote se está trabajando: nombre y cultivo, sin que haya que volver atrás para saberlo (Tesler). */
export function ContextoDeLote({
  nombre,
  cultivo,
}: {
  readonly nombre: string;
  readonly cultivo: string;
}) {
  return (
    <Tarjeta className="flex-row items-center gap-3 p-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">
        <Icono nombre="leaf-outline" tono="primary" />
      </View>
      <View className="flex-1">
        <Texto variante="etiqueta">{nombre}</Texto>
        <Texto variante="ayuda">{cultivo}</Texto>
      </View>
    </Tarjeta>
  );
}
