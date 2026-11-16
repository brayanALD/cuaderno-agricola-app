import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { Boton } from '../Boton';
import { MensajeError } from '../MensajeError';

export interface DisposicionDeFormularioProps {
  /** Los campos: se desplazan. */
  readonly children: ReactNode;
  readonly textoBoton: string;
  readonly cargando: boolean;
  readonly alGuardar: () => void;
  /** Error que no pertenece a un campo (p. ej. «El lote no existe»): se lee junto al botón. */
  readonly errorGeneral?: string | null;
}

/**
 * Todos los formularios tienen la misma forma (D104): los campos se desplazan y el botón de guardar queda fijo
 * abajo, siempre al alcance del pulgar (Fitts), con el error general justo encima. La pantalla que lo usa no
 * debe desplazarse por su cuenta (`Pantalla desplazable={false} relleno={false}`).
 */
export function DisposicionDeFormulario({
  children,
  textoBoton,
  cargando,
  alGuardar,
  errorGeneral,
}: DisposicionDeFormularioProps) {
  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 p-4 pb-6"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      <View className="gap-2 border-t border-divider bg-surface px-4 pb-4 pt-3">
        <MensajeError texto={errorGeneral ?? undefined} />
        <Boton titulo={textoBoton} cargando={cargando} className="py-4" onPress={alGuardar} />
      </View>
    </View>
  );
}
