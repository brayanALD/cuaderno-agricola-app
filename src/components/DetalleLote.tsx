import { View } from 'react-native';
import { useHoy } from '@/hooks/useHoy';
import { useProduccion, useProximaLabor } from '@/hooks/useLabores';
import { useLote } from '@/hooks/useLotes';
import { formatearCantidad } from '@/services/cantidad';
import { ETIQUETA_TIPO, textoDias, textoVencimiento } from '@/services/etiquetas';
import { diasDesdeSiembra, formatearFecha, formatearMes } from '@/services/fechas';
import { AvisoDeSync } from './AvisoDeSync';
import { Insignia } from './Insignia';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';
import { Vista } from './Vista';

const kg = (valor: number): string => `${formatearCantidad(valor)} kg`;

/** Ficha del lote: lo que se desliza entre lotes. Dentro de `DeslizarLotes`, con `key` = id. */
export function FichaLote({ id }: { readonly id: string }) {
  const lote = useLote(id);
  const hoy = useHoy();
  return (
    <Vista
      carga={lote}
      vacio={{
        titulo: 'Este lote ya no existe',
        mensaje: 'Pudo borrarse desde otra pantalla. Vuelve a la lista de lotes.',
        icono: 'alert-circle-outline',
      }}
    >
      {(datos) => (
        <Tarjeta>
          <View className="flex-row items-center justify-between gap-2">
            <Texto variante="titulo" className="flex-1">
              {datos.nombre}
            </Texto>
            <Insignia>{textoDias(diasDesdeSiembra(datos.fecha_siembra, hoy))}</Insignia>
          </View>
          <Texto>Cultivo: {datos.cultivo}</Texto>
          <Texto>Área: {datos.area_m2} m²</Texto>
          <Texto>Sembrado el {formatearFecha(datos.fecha_siembra)}</Texto>
          <Texto>Altitud: {datos.altitud_m === null ? 'sin medir' : `${datos.altitud_m} m`}</Texto>
          {datos.lat !== null && datos.lng !== null ? (
            <Texto tono="tenue">
              Coordenadas: {datos.lat}, {datos.lng}
            </Texto>
          ) : null}
          <AvisoDeSync mensaje={datos.sync_error} />
        </Tarjeta>
      )}
    </Vista>
  );
}

/** Próxima labor sugerida (RF-03) y producción en kg por lote y por mes (RF-04). */
export function ResumenLote({ id }: { readonly id: string }) {
  const proxima = useProximaLabor(id);
  const produccion = useProduccion(id);
  return (
    <View className="gap-4">
      <Tarjeta>
        <Texto variante="subtitulo">Próxima labor sugerida</Texto>
        <Vista carga={proxima} vacio={{ titulo: 'Sin sugerencia', mensaje: 'El lote no existe.' }}>
          {(s) => (
            <Texto
              accessibilityLabel={`Próxima labor sugerida: ${ETIQUETA_TIPO[s.tipo]}, ${textoVencimiento(s.diasRestantes)}`}
            >
              {ETIQUETA_TIPO[s.tipo]} · {textoVencimiento(s.diasRestantes)} (
              {formatearFecha(s.fecha)})
            </Texto>
          )}
        </Vista>
      </Tarjeta>
      <Tarjeta>
        <Texto variante="subtitulo">Producción</Texto>
        <Vista
          carga={produccion}
          vacio={{
            titulo: 'Aún no hay cosechas',
            mensaje: 'Registra una labor de tipo cosecha para ver el total en kg.',
            icono: 'basket-outline',
          }}
        >
          {(p) => (
            <View className="gap-1">
              <Texto variante="titulo">Total: {kg(p.totalKg)}</Texto>
              {p.porMes.map((mes) => (
                <Texto key={mes.mes} tono="tenue">
                  {formatearMes(mes.mes)}: {kg(mes.kg)}
                </Texto>
              ))}
            </View>
          )}
        </Vista>
      </Tarjeta>
    </View>
  );
}
