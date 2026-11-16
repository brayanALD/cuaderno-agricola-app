import type { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useInsetInferior } from '@/hooks/useInsetInferior';
import { BotonIcono } from './BotonIcono';
import { Texto } from './Texto';

/** Cortina neutra: oscurece lo de atrás en los dos temas. No es un color de marca, por eso no es un token. */
const CORTINA = 'rgba(0, 0, 0, 0.5)';

export interface HojaInferiorProps {
  readonly visible: boolean;
  readonly titulo: string;
  readonly alCerrar: () => void;
  readonly children: ReactNode;
}

/**
 * Hoja que sube desde abajo (patrón de Android para elegir o decidir sin salir de la pantalla). Se cierra
 * tocando fuera o con «atrás»; con «reducir movimiento» aparece sin deslizarse. Deja el margen inferior del
 * gesto de inicio del teléfono (D87).
 */
export function HojaInferior({ visible, titulo, alCerrar, children }: HojaInferiorProps) {
  const reducido = useReducedMotion();
  const inferior = useInsetInferior();
  return (
    <Modal
      transparent
      visible={visible}
      animationType={reducido ? 'none' : 'slide'}
      statusBarTranslucent
      onRequestClose={alCerrar}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: CORTINA }}>
        {/* Tocar fuera cierra para quien ve; TalkBack usa el botón «Cerrar» de dentro de la hoja. */}
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={alCerrar}
          className="flex-1"
        />
        <View
          accessibilityViewIsModal
          className="gap-3 rounded-t-3xl bg-surface px-4 pt-3"
          style={{ paddingBottom: inferior + 8 }}
        >
          <View className="mb-1 h-1 w-8 self-center rounded-full bg-border" />
          <View className="flex-row items-center gap-2">
            <Texto variante="subtitulo" accessibilityRole="header" className="flex-1">
              {titulo}
            </Texto>
            <BotonIcono icono="close" etiqueta={`Cerrar: ${titulo}`} onPress={alCerrar} />
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
