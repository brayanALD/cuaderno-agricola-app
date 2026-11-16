import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { useColores } from '@/theme/EsquemaProvider';
import { BotonIcono } from './BotonIcono';
import { Icono } from './Icono';
import { unir } from './unir';

export interface BarraDeBusquedaProps {
  /** Qué se busca: es el nombre accesible y el texto de ayuda («Buscar lote o cultivo»). */
  readonly etiqueta: string;
  readonly valor: string;
  readonly alCambiar: (texto: string) => void;
}

/**
 * Búsqueda compacta (56 dp en vez de un campo con etiqueta aparte, D104): icono, texto de ayuda y un botón para
 * borrar lo escrito. El borde pasa a color de foco al escribir (WCAG 2.4.7).
 */
export function BarraDeBusqueda({ etiqueta, valor, alCambiar }: BarraDeBusquedaProps) {
  const colores = useColores();
  const [enfocada, setEnfocada] = useState(false);
  return (
    <View
      className={unir(
        'min-h-[52px] flex-row items-center gap-2 rounded-xl border-2 bg-surface pl-3 pr-1',
        enfocada ? 'border-focus' : 'border-border',
      )}
    >
      <Icono nombre="search" tono="textMuted" />
      <TextInput
        accessibilityLabel={etiqueta}
        placeholder={etiqueta}
        placeholderTextColor={colores.textMuted}
        value={valor}
        onChangeText={alCambiar}
        onFocus={() => setEnfocada(true)}
        onBlur={() => setEnfocada(false)}
        returnKeyType="search"
        autoCorrect={false}
        className="flex-1 py-2 text-base text-text"
      />
      {valor === '' ? null : (
        <BotonIcono icono="close" etiqueta="Borrar la búsqueda" onPress={() => alCambiar('')} />
      )}
    </View>
  );
}
