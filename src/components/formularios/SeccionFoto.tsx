import { CameraView } from 'expo-camera';
import { useState } from 'react';
import { Image, View } from 'react-native';
import { useGaleria } from '@/hooks/useGaleria';
import { Boton } from '../Boton';
import { MensajeError } from '../MensajeError';
import { Texto } from '../Texto';
import { ModalCamara } from './ModalCamara';

interface Props {
  readonly uri: string | null;
  readonly alCambiar: (uri: string | null) => void;
}

const SIN_CAMARA = 'Este teléfono no tiene cámara disponible. Elige una foto de la galería.';

/** Código del error cuando la plataforma no ofrece `isAvailableAsync` (en Android solo existe en web). */
const SIN_COMPROBACION = 'ERR_UNAVAILABLE';

/**
 * Regla 1 de la especificación: preguntar si hay cámara antes de abrirla. Android no ofrece esa consulta:
 * ahí se da por hecha y, si no arranca, `ModalCamara` avisa (`onMountError`). Cualquier otro fallo = «no».
 */
async function hayCamara(): Promise<boolean> {
  try {
    return await CameraView.isAvailableAsync();
  } catch (error) {
    return typeof error === 'object' && error !== null && 'code' in error
      ? error.code === SIN_COMPROBACION
      : false;
  }
}

/** Botones de la sección: cámara y galería siempre; «Quitar foto» solo si ya hay una. */
function BotonesDeFoto({
  hayFoto,
  alTomar,
  alElegir,
  alQuitar,
}: {
  readonly hayFoto: boolean;
  readonly alTomar: () => void;
  readonly alElegir: () => void;
  readonly alQuitar: () => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      <Boton titulo="Tomar foto" icono="camera-outline" variante="secundario" onPress={alTomar} />
      <Boton
        titulo="Galería"
        etiqueta="Elegir de la galería"
        icono="images-outline"
        variante="secundario"
        onPress={alElegir}
      />
      {hayFoto ? (
        <Boton
          titulo="Quitar foto"
          icono="close-circle-outline"
          variante="texto"
          onPress={alQuitar}
        />
      ) : null}
    </View>
  );
}

/**
 * Foto de la labor: cámara (segunda capacidad, P1) con la galería como alternativa (D34), con vista previa
 * y botón para quitarla.
 */
export function SeccionFoto({ uri, alCambiar }: Props) {
  const { elegir, error } = useGaleria();
  const [camaraAbierta, setCamaraAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const elegirFoto = async () => {
    const elegida = await elegir();
    if (elegida !== null) alCambiar(elegida);
  };

  const abrirCamara = async () => {
    const hay = await hayCamara();
    setAviso(hay ? null : SIN_CAMARA);
    setCamaraAbierta(hay);
  };

  return (
    <View className="gap-2">
      <Texto variante="etiqueta">Foto (opcional)</Texto>
      {uri ? (
        <Image
          source={{ uri }}
          accessibilityLabel="Vista previa de la foto elegida"
          accessibilityIgnoresInvertColors
          className="h-40 w-full rounded-xl bg-surface-muted"
          resizeMode="cover"
        />
      ) : null}
      <BotonesDeFoto
        hayFoto={uri !== null}
        alTomar={() => void abrirCamara()}
        alElegir={() => void elegirFoto()}
        alQuitar={() => alCambiar(null)}
      />
      <MensajeError texto={aviso ?? error ?? undefined} />
      {camaraAbierta ? (
        <ModalCamara
          alFoto={(nueva) => {
            setCamaraAbierta(false);
            alCambiar(nueva);
          }}
          alCerrar={() => setCamaraAbierta(false)}
        />
      ) : null}
    </View>
  );
}
