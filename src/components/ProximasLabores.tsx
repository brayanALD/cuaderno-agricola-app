import { Pressable, View } from 'react-native';
import type { TipoLabor } from '@/db/modelo';
import { useProximasLabores } from '@/hooks/useLabores';
import {
  estadoDeVencimiento,
  ETIQUETA_TIPO,
  textoVencimiento,
  type EstadoDeVencimiento,
} from '@/services/etiquetas';
import type { ProximaLabor } from '@/services/laborService';
import type { TokenColor } from '@/theme/tokens';
import { Boton } from './Boton';
import { EsqueletoDeLabores } from './esqueletos';
import { FranjaDeLabor } from './FranjaDeLabor';
import { Icono, type NombreIcono } from './Icono';
import { Tarjeta } from './Tarjeta';
import { Texto } from './Texto';
import { Vista } from './Vista';

const GRUPOS: readonly {
  estado: EstadoDeVencimiento;
  titulo: string;
  icono: NombreIcono;
  tono: TokenColor;
}[] = [
  { estado: 'vencida', titulo: 'Vencidas', icono: 'alert-circle-outline', tono: 'danger' },
  { estado: 'hoy', titulo: 'Para hoy', icono: 'time-outline', tono: 'textMuted' },
  { estado: 'proxima', titulo: 'Próximas', icono: 'calendar-outline', tono: 'textMuted' },
];

interface AccionesProps {
  readonly alAbrirLote: (id: string) => void;
  readonly alRegistrar: (loteId: string, tipo: TipoLabor) => void;
}

/** Una labor que toca: tocarla abre el lote y «Registrar» abre el formulario con lote y tipo ya elegidos. */
function TarjetaPendiente({
  pendiente: { lote, sugerencia },
  alAbrirLote,
  alRegistrar,
}: AccionesProps & { readonly pendiente: ProximaLabor }) {
  const cuando = textoVencimiento(sugerencia.diasRestantes);
  const tipo = ETIQUETA_TIPO[sugerencia.tipo];
  return (
    <Tarjeta className="gap-2 p-3">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${tipo} sugerido en ${lote.nombre}: ${cuando}. Abrir el lote`}
        onPress={() => alAbrirLote(lote.id)}
        className="min-h-[48px] justify-center focus:border-focus"
      >
        <FranjaDeLabor
          tipo={sugerencia.tipo}
          fecha={sugerencia.fecha}
          diasRestantes={sugerencia.diasRestantes}
          titulo={`${tipo} · ${lote.nombre}`}
        />
      </Pressable>
      <Boton
        titulo="Registrar"
        etiqueta={`Registrar ${tipo.toLowerCase()} en ${lote.nombre}`}
        icono="add"
        variante="tonal"
        onPress={() => alRegistrar(lote.id, sugerencia.tipo)}
      />
    </Tarjeta>
  );
}

function Grupos({
  datos,
  ...acciones
}: AccionesProps & { readonly datos: readonly ProximaLabor[] }) {
  return (
    <View className="gap-3">
      {GRUPOS.map(({ estado, titulo, icono, tono }) => {
        const delGrupo = datos.filter(
          (p) => estadoDeVencimiento(p.sugerencia.diasRestantes) === estado,
        );
        if (delGrupo.length === 0) return null;
        return (
          <View key={estado} className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <Icono nombre={icono} tamano={20} tono={tono} />
              <Texto variante="etiqueta" tono={estado === 'vencida' ? 'peligro' : 'texto'}>
                {`${titulo} · ${String(delGrupo.length)}`}
              </Texto>
            </View>
            {delGrupo.map((pendiente) => (
              <TarjetaPendiente key={pendiente.lote.id} pendiente={pendiente} {...acciones} />
            ))}
          </View>
        );
      })}
    </View>
  );
}

/**
 * RF-03: qué labor toca primero en cada lote, en tres grupos: vencidas (arriba y en rojo suave, sin alarma),
 * de hoy y próximas (D104). Con un tipo elegido solo se ven las de ese tipo.
 */
export function ProximasLabores({
  tipo,
  ...acciones
}: AccionesProps & { readonly tipo: TipoLabor | null }) {
  const proximas = useProximasLabores();
  return (
    <Vista
      carga={proximas}
      esqueleto={<EsqueletoDeLabores />}
      vacio={{
        titulo: 'Sin lotes todavía',
        mensaje: 'Cuando registres un lote verás aquí qué labor le toca.',
        icono: 'calendar-outline',
      }}
    >
      {(datos) => (
        <Grupos
          datos={tipo === null ? datos : datos.filter((p) => p.sugerencia.tipo === tipo)}
          {...acciones}
        />
      )}
    </Vista>
  );
}
