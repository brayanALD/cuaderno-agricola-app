import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useCiclos } from '@/hooks/useLabores';
import { formatearCantidad } from '@/services/cantidad';
import { formatearFecha } from '@/services/fechas';
import { Icono } from './Icono';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';

/**
 * Ciclos de cultivo ya cerrados de este lote (D95), plegados: se ven al abrirlos. Sin ciclos cerrados no pinta
 * nada. El encabezado entero es el botón (48 dp) y dice si está abierto.
 */
export function CiclosAnteriores({ id }: { readonly id: string }) {
  const { vista } = useCiclos(id);
  const [abierto, setAbierto] = useState(false);
  if (vista.estado !== 'listo') return null;
  return (
    <Tarjeta className="gap-0 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ciclos anteriores, ${String(vista.datos.length)}`}
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((antes) => !antes)}
        className="min-h-[48px] flex-row items-center gap-2"
      >
        <Texto variante="subtitulo" className="flex-1">
          Ciclos anteriores
        </Texto>
        <Texto tono="tenue">{vista.datos.length}</Texto>
        <Icono nombre={abierto ? 'chevron-up' : 'chevron-down'} tono="textMuted" />
      </Pressable>
      {abierto ? (
        <View className="gap-2 pb-3 pt-1">
          {vista.datos.map((ciclo) => (
            <Texto key={ciclo.id} tono="tenue">
              {ciclo.cultivo}: del {formatearFecha(ciclo.fecha_inicio)} al{' '}
              {formatearFecha(ciclo.fecha_fin)} · {formatearCantidad(ciclo.total_kg)} kg
            </Texto>
          ))}
        </View>
      ) : null}
    </Tarjeta>
  );
}
