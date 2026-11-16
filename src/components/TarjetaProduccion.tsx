import { useState } from 'react';
import { View } from 'react-native';
import { useHoy } from '@/hooks/useHoy';
import { useProduccion } from '@/hooks/useLabores';
import { formatearCantidad } from '@/services/cantidad';
import { formatearMes } from '@/services/fechas';
import type { Produccion } from '@/services/produccionService';
import { Boton } from './Boton';
import { EsqueletoDeContenido } from './esqueletos';
import { GraficoProduccion } from './GraficoProduccion';
import { Insignia } from './Insignia';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';
import { Vista } from './Vista';

const kg = (valor: number): string => `${formatearCantidad(valor)} kg`;

/** Costo total y por kg, solo si hay costos registrados (D95). */
function Costos({ produccion }: { readonly produccion: Produccion }) {
  if (produccion.costoTotal <= 0) return null;
  return (
    <View className="flex-row gap-4 border-t border-divider pt-3">
      <View className="flex-1">
        <Texto variante="ayuda">Costo total</Texto>
        <Texto variante="subtitulo">{formatearCantidad(produccion.costoTotal)}</Texto>
      </View>
      {produccion.costoPorKg === null ? null : (
        <View className="flex-1">
          <Texto variante="ayuda">Costo por kg</Texto>
          <Texto variante="subtitulo">{formatearCantidad(produccion.costoPorKg)}</Texto>
        </View>
      )}
    </View>
  );
}

/** Los mismos datos del gráfico como texto: alternativa para quien no ve las barras (WCAG 1.1.1). */
function ListaDeMeses({ produccion }: { readonly produccion: Produccion }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <View className="gap-1">
      <Boton
        titulo={abierta ? 'Ocultar la lista' : 'Ver los datos en lista'}
        icono="list-outline"
        variante="texto"
        onPress={() => setAbierta((antes) => !antes)}
      />
      {abierta
        ? produccion.porMes.map((mes) => (
            <Texto key={mes.mes}>
              {formatearMes(mes.mes)}: {kg(mes.kg)}
            </Texto>
          ))
        : null}
    </View>
  );
}

function Contenido({ produccion, mesActual }: { produccion: Produccion; mesActual: string }) {
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline gap-2">
        <Texto variante="metrica">{kg(produccion.totalKg)}</Texto>
        <Texto variante="ayuda">total del ciclo</Texto>
      </View>
      <GraficoProduccion meses={produccion.porMes} mesActual={mesActual} />
      <Costos produccion={produccion} />
      <ListaDeMeses produccion={produccion} />
    </View>
  );
}

/** Producción en kg por mes (RF-04) y, si hay costos registrados, costo total y por kg (D95). */
export function TarjetaProduccion({ id }: { readonly id: string }) {
  const produccion = useProduccion(id);
  const hoy = useHoy();
  return (
    <Tarjeta>
      <View className="flex-row items-center justify-between gap-2">
        <Texto variante="subtitulo">Producción</Texto>
        <Insignia tono="neutro">Ciclo actual</Insignia>
      </View>
      <Vista
        carga={produccion}
        esqueleto={<EsqueletoDeContenido />}
        vacio={{
          titulo: 'Aún no hay cosechas',
          mensaje: 'Registra una labor de tipo cosecha para ver el total en kg.',
          icono: 'basket-outline',
        }}
      >
        {(datos) => <Contenido produccion={datos} mesActual={hoy.slice(0, 7)} />}
      </Vista>
    </Tarjeta>
  );
}
