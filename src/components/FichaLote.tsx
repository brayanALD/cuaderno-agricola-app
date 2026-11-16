import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { LoteFila } from '@/db/modelo';
import { useHoy } from '@/hooks/useHoy';
import { useLote } from '@/hooks/useLotes';
import { textoDias } from '@/services/etiquetas';
import { diasDesdeSiembra, formatearFecha } from '@/services/fechas';
import { AvisoDeSync } from './AvisoDeSync';
import { ElegirVersion } from './ElegirVersion';
import { EsqueletoDeTarjeta } from './esqueletos';
import { Icono, type NombreIcono } from './Icono';
import { Insignia } from './Insignia';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';
import { Vista } from './Vista';

/** Un dato del lote (altitud, área, finca): icono, valor y qué es. Una sola unidad para el lector de pantalla. */
function Dato({ icono, valor, etiqueta }: { icono: NombreIcono; valor: string; etiqueta: string }) {
  return (
    <View accessible accessibilityLabel={`${etiqueta}: ${valor}`} className="flex-1 gap-0.5">
      <Icono nombre={icono} tamano={20} tono="textMuted" />
      <Texto variante="etiqueta">{valor}</Texto>
      <Texto variante="ayuda">{etiqueta}</Texto>
    </View>
  );
}

/** Altitud, área y finca en una fila, y las coordenadas debajo si se conocen. */
function DatosDelLote({ lote }: { readonly lote: LoteFila }) {
  return (
    <>
      <View className="flex-row gap-2">
        <Dato
          icono="trending-up-outline"
          valor={lote.altitud_m === null ? 'sin medir' : `${lote.altitud_m} m`}
          etiqueta="Altitud"
        />
        <Dato icono="resize-outline" valor={`${lote.area_m2} m²`} etiqueta="Área" />
        {lote.finca === null ? null : (
          <Dato icono="home-outline" valor={lote.finca} etiqueta="Finca" />
        )}
      </View>
      {lote.lat !== null && lote.lng !== null ? (
        <View className="flex-row items-center gap-1">
          <Icono nombre="location-outline" tamano={16} tono="textMuted" />
          <Texto variante="ayuda">
            {lote.lat}, {lote.lng}
          </Texto>
        </View>
      ) : null}
    </>
  );
}

/**
 * Ficha del lote: lo que se desliza entre lotes. Dentro de `DeslizarLotes`, con `key` = id. Jerarquía (D104): el
 * nombre y los días desde la siembra primero; altitud, área y finca como datos secundarios en una fila.
 * `menu` es el ⋮ con las acciones del lote.
 */
export function FichaLote({ id, menu }: { readonly id: string; readonly menu?: ReactNode }) {
  const lote = useLote(id);
  const hoy = useHoy();
  return (
    <Vista
      carga={lote}
      esqueleto={<EsqueletoDeTarjeta />}
      vacio={{
        titulo: 'Este lote ya no existe',
        mensaje: 'Pudo borrarse desde otra pantalla. Vuelve a la lista de lotes.',
        icono: 'alert-circle-outline',
      }}
    >
      {(datos) => (
        <Tarjeta>
          <View className="flex-row items-start gap-2">
            <Texto variante="titulo" className="flex-1">
              {datos.nombre}
            </Texto>
            {menu}
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Insignia tono="marca" icono="leaf-outline">
              {datos.cultivo}
            </Insignia>
            <Texto variante="ayuda">Sembrado el {formatearFecha(datos.fecha_siembra)}</Texto>
          </View>
          <Texto variante="metrica">{textoDias(diasDesdeSiembra(datos.fecha_siembra, hoy))}</Texto>
          <View className="my-1 h-px bg-divider" />
          <DatosDelLote lote={datos} />
          <AvisoDeSync mensaje={datos.sync_error} />
          {datos.conflicto === null ? null : <ElegirVersion entidad="lote" id={datos.id} />}
        </Tarjeta>
      )}
    </Vista>
  );
}
