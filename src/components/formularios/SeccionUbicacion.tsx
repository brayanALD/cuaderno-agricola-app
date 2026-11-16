import { useEffect } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { View } from 'react-native';
import { useUbicacionConAltitud } from '@/sensors/useUbicacionConAltitud';
import type { AltitudElegida } from '@/services/altitud';
import type { ValoresLote } from '@/services/formularios';
import type { DatosLote } from '@/services/validacion';
import type { Medicion } from '@/sensors/ubicacion';
import { Boton } from '../Boton';
import { Icono } from '../Icono';
import { Texto } from '../Texto';
import { CampoControlado } from './CampoControlado';

type ControlLote = Control<ValoresLote, unknown, DatosLote>;

const unDecimal = (valor: number): string => String(Math.round(valor * 10) / 10);

/** Cuando hay una medición, rellena coordenadas y altitud (siguen editables a mano). */
function useRellenarDesdeUbicacion(
  setValue: UseFormSetValue<ValoresLote>,
  medicion: Medicion | null,
  altitud: AltitudElegida | null,
) {
  useEffect(() => {
    if (medicion === null) return;
    setValue('lat', String(medicion.lat), { shouldValidate: true });
    setValue('lng', String(medicion.lng), { shouldValidate: true });
    if (altitud?.metros != null) {
      setValue('altitud_m', unDecimal(altitud.metros), { shouldValidate: true });
    }
  }, [medicion, altitud, setValue]);
}

/** Qué pasó con la ubicación (error) y de dónde salió la altitud (aviso de menor precisión). */
function MensajesDeUbicacion({ mensaje, aviso }: { mensaje: string | null; aviso: string | null }) {
  return (
    <>
      {mensaje ? (
        <View accessible accessibilityRole="alert" className="flex-row items-center gap-1">
          <Icono nombre="alert-circle" tamano={18} tono="danger" />
          <Texto variante="error" className="flex-1">
            {mensaje}
          </Texto>
        </View>
      ) : null}
      {aviso ? (
        <View accessible accessibilityLiveRegion="polite" className="flex-row items-center gap-1">
          <Icono nombre="information-circle" tamano={18} tono="primary" />
          <Texto variante="ayuda" className="flex-1">
            {aviso}
          </Texto>
        </View>
      ) : null}
    </>
  );
}

/**
 * RF-02: lote «aquí». El botón mide la ubicación y rellena coordenadas y altitud; los tres campos
 * siguen editables (la alternativa manual) y avisan si la altitud viene del GPS, menos precisa.
 */
export function SeccionUbicacion({
  control,
  setValue,
}: {
  readonly control: ControlLote;
  readonly setValue: UseFormSetValue<ValoresLote>;
}) {
  const { estado, medicion, altitud, mensaje, obtener } = useUbicacionConAltitud();
  useRellenarDesdeUbicacion(setValue, medicion, altitud);

  return (
    <View className="gap-3">
      <Texto variante="subtitulo">Ubicación (opcional)</Texto>
      <Boton
        titulo="Usar mi ubicación"
        icono="locate"
        variante="secundario"
        cargando={estado === 'buscando'}
        onPress={() => void obtener()}
      />
      <MensajesDeUbicacion mensaje={mensaje} aviso={altitud?.aviso ?? null} />
      <CampoControlado
        control={control}
        name="altitud_m"
        etiqueta="Altitud (m)"
        teclado="numbers-and-punctuation"
        ayuda="Entre 0 y 6000 m. Déjala vacía si no la conoces."
      />
      <CampoControlado
        control={control}
        name="lat"
        etiqueta="Latitud"
        teclado="numbers-and-punctuation"
      />
      <CampoControlado
        control={control}
        name="lng"
        etiqueta="Longitud"
        teclado="numbers-and-punctuation"
      />
    </View>
  );
}
