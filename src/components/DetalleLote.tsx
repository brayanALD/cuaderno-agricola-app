import { View } from 'react-native';
import { useHoy } from '@/hooks/useHoy';
import { useCarencia, useCiclos, useProduccion, useProximaLabor } from '@/hooks/useLabores';
import { useLote } from '@/hooks/useLotes';
import { formatearCantidad } from '@/services/cantidad';
import { ETIQUETA_TIPO, textoDias, textoVencimiento } from '@/services/etiquetas';
import { diasDesdeSiembra, formatearFecha, formatearMes } from '@/services/fechas';
import { AvisoDeCarencia } from './AvisoDeCarencia';
import { AvisoDeSync } from './AvisoDeSync';
import { ElegirVersion } from './ElegirVersion';
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
          {datos.finca === null ? null : <Texto>Finca: {datos.finca}</Texto>}
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
          {datos.conflicto === null ? null : <ElegirVersion entidad="lote" id={datos.id} />}
        </Tarjeta>
      )}
    </Vista>
  );
}

/** Producción en kg por mes (RF-04) y, si hay costos registrados, costo total y por kg (D95). */
function TarjetaProduccion({ id }: { readonly id: string }) {
  const produccion = useProduccion(id);
  return (
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
            {p.costoTotal > 0 ? (
              <Texto>Costo total: {formatearCantidad(p.costoTotal)}</Texto>
            ) : null}
            {p.costoTotal > 0 && p.costoPorKg !== null ? (
              <Texto>Costo por kg: {formatearCantidad(p.costoPorKg)}</Texto>
            ) : null}
          </View>
        )}
      </Vista>
    </Tarjeta>
  );
}

/** Próxima labor sugerida (RF-03) y producción en kg por lote y por mes (RF-04). */
export function ResumenLote({ id }: { readonly id: string }) {
  const proxima = useProximaLabor(id);
  return (
    <View className="gap-4">
      <CarenciaVigente id={id} />
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
      <TarjetaProduccion id={id} />
      <CiclosAnteriores id={id} />
    </View>
  );
}

/** Aviso mientras dure el periodo de carencia de la última aplicación (D95). Sin carencia vigente no pinta nada. */
function CarenciaVigente({ id }: { readonly id: string }) {
  const { vista } = useCarencia(id);
  const hoy = useHoy();
  if (vista.estado !== 'listo' || vista.datos.hasta <= hoy) return null;
  const { hasta, producto } = vista.datos;
  return (
    <AvisoDeCarencia
      texto={`Periodo de carencia${producto === null ? '' : ` de ${producto}`}: no coseches antes del ${formatearFecha(hasta)}.`}
    />
  );
}

/** Ciclos de cultivo ya cerrados de este lote (D95). Sin ciclos cerrados no pinta nada. */
function CiclosAnteriores({ id }: { readonly id: string }) {
  const { vista } = useCiclos(id);
  if (vista.estado !== 'listo') return null;
  return (
    <Tarjeta>
      <Texto variante="subtitulo">Ciclos anteriores</Texto>
      {vista.datos.map((ciclo) => (
        <Texto key={ciclo.id} tono="tenue">
          {ciclo.cultivo}: del {formatearFecha(ciclo.fecha_inicio)} al{' '}
          {formatearFecha(ciclo.fecha_fin)} · {kg(ciclo.total_kg)}
        </Texto>
      ))}
    </Tarjeta>
  );
}
