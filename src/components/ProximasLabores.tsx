import { Pressable, View } from 'react-native';
import { useProximasLabores } from '@/hooks/useLabores';
import { ETIQUETA_TIPO, textoVencimiento } from '@/services/etiquetas';
import { formatearFecha } from '@/services/fechas';
import { Insignia } from './Insignia';
import { Texto } from './Texto';
import { Vista } from './Vista';

/** RF-03: qué labor toca primero en cada lote; las vencidas salen arriba. */
export function ProximasLabores({ alAbrirLote }: { readonly alAbrirLote: (id: string) => void }) {
  const proximas = useProximasLabores();
  return (
    <View className="gap-2">
      <Texto variante="subtitulo">Próximas labores</Texto>
      <Vista
        carga={proximas}
        vacio={{
          titulo: 'Sin lotes todavía',
          mensaje: 'Cuando registres un lote verás aquí qué labor le toca.',
          icono: 'calendar-outline',
        }}
      >
        {(datos) => (
          <View className="gap-2">
            {datos.map(({ lote, sugerencia }) => {
              const cuando = textoVencimiento(sugerencia.diasRestantes);
              return (
                <Pressable
                  key={lote.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${ETIQUETA_TIPO[sugerencia.tipo]} sugerido en ${lote.nombre}: ${cuando}. Abrir el lote`}
                  onPress={() => alAbrirLote(lote.id)}
                  className="min-h-[48px] gap-1 rounded-2xl border-2 border-border bg-surface p-4 active:bg-surface-muted focus:border-focus"
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Texto variante="subtitulo" className="flex-1">
                      {ETIQUETA_TIPO[sugerencia.tipo]} · {lote.nombre}
                    </Texto>
                    <Insignia>{cuando}</Insignia>
                  </View>
                  <Texto tono="tenue">{formatearFecha(sugerencia.fecha)}</Texto>
                </Pressable>
              );
            })}
          </View>
        )}
      </Vista>
    </View>
  );
}
