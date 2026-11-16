import { useEffect } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { View } from 'react-native';
import { useUbicacionConAltitud } from '@/sensors/useUbicacionConAltitud';
import type { AltitudElegida } from '@/services/altitud';
import type { ValoresLote } from '@/services/formularios';
import type { DatosLote } from '@/services/validacion';
import type { Medicion } from '@/sensors/ubicacion';
import { Banner } from '../Banner';
import { Boton } from '../Boton';
import { Icono } from '../Icono';
import { Tarjeta } from '../Tarjeta';
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
      {mensaje ? <Banner tono="error" icono="alert-circle" texto={mensaje} /> : null}
      {aviso ? <Banner icono="information-circle" texto={aviso} /> : null}
    </>
  );
}

/** Latitud y longitud lado a lado: se llenan juntas. */
function Coordenadas({ control }: { readonly control: ControlLote }) {
  return (
    <View className="flex-row gap-3">
      <View className="flex-1">
        <CampoControlado
          control={control}
          name="lat"
          etiqueta="Latitud"
          teclado="numbers-and-punctuation"
        />
      </View>
      <View className="flex-1">
        <CampoControlado
          control={control}
          name="lng"
          etiqueta="Longitud"
          teclado="numbers-and-punctuation"
        />
      </View>
    </View>
  );
}

/**
 * RF-02: lote «aquí». El botón mide la ubicación y rellena coordenadas y altitud; los tres campos
 * siguen editables (la alternativa manual) y avisan si la altitud viene del GPS, menos precisa. Todo junto en
 * una tarjeta, con latitud y longitud lado a lado (D104).
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
    <Tarjeta className="gap-3">
      <View className="flex-row items-center gap-2">
        <Icono nombre="location-outline" tono="primary" />
        <Texto variante="subtitulo">Ubicación (opcional)</Texto>
      </View>
      <Boton
        titulo="Usar mi ubicación"
        icono="locate"
        variante="tonal"
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
      <Coordenadas control={control} />
    </Tarjeta>
  );
}
