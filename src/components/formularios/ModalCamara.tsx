import { CameraView } from 'expo-camera';
import { Modal, View } from 'react-native';
import { useCamara } from '@/hooks/useCamara';
import { useInsetInferior } from '@/hooks/useInsetInferior';
import { Boton } from '../Boton';
import { MensajeError } from '../MensajeError';
import { Texto } from '../Texto';

interface Props {
  readonly alFoto: (uri: string) => void;
  readonly alCerrar: () => void;
}

/** Pide el permiso solo cuando el usuario lo acepta y explica para qué (regla 2 de la especificación). */
function PedirPermiso({
  denegado,
  alPedir,
  alCerrar,
}: {
  readonly denegado: boolean;
  readonly alPedir: () => void;
  readonly alCerrar: () => void;
}) {
  return (
    <View className="flex-1 justify-center gap-4 p-4">
      <Texto variante="titulo">Cámara</Texto>
      <Texto>
        {denegado
          ? 'No tenemos permiso para usar la cámara. Puedes activarlo en los ajustes del teléfono o elegir una foto de la galería.'
          : 'La cámara se usa solo para fotografiar esta labor. La foto se guarda en tu teléfono y se sube al sincronizar.'}
      </Texto>
      {denegado ? null : (
        <Boton titulo="Permitir cámara" icono="camera-outline" onPress={alPedir} />
      )}
      <Boton titulo="Cancelar" variante="texto" onPress={alCerrar} />
    </View>
  );
}

/** Vista previa a pantalla completa con «Tomar foto». Siempre hay «Cancelar» (la galería es la alternativa). */
export function ModalCamara({ alFoto, alCerrar }: Props) {
  const { camara, permiso, pedirPermiso, ocupado, error, capturar, alFallarInicio } =
    useCamara(alFoto);
  const inferior = useInsetInferior();
  const concedido = permiso?.granted === true;
  return (
    <Modal
      testID="modal-camara"
      animationType="slide"
      onRequestClose={alCerrar}
      accessibilityViewIsModal
    >
      <View className="flex-1 bg-background">
        {concedido ? (
          <>
            <CameraView
              ref={camara}
              facing="back"
              style={{ flex: 1 }}
              onMountError={alFallarInicio}
            />
            <View style={{ paddingBottom: inferior }} className="gap-2 p-4">
              <MensajeError texto={error ?? undefined} />
              <Boton
                titulo="Tomar foto"
                icono="camera"
                cargando={ocupado}
                onPress={() => void capturar()}
              />
              <Boton titulo="Cancelar" variante="texto" onPress={alCerrar} />
            </View>
          </>
        ) : (
          <PedirPermiso
            denegado={permiso !== null && !permiso.canAskAgain}
            alPedir={() => void pedirPermiso()}
            alCerrar={alCerrar}
          />
        )}
      </View>
    </Modal>
  );
}
