import { View } from 'react-native';
import type { TipoLabor } from '@/db/modelo';
import { useHoy } from '@/hooks/useHoy';
import { useCarencia, useProximaLabor } from '@/hooks/useLabores';
import { ETIQUETA_TIPO } from '@/services/etiquetas';
import { formatearFecha } from '@/services/fechas';
import { AvisoDeCarencia } from './AvisoDeCarencia';
import { Boton } from './Boton';
import { CiclosAnteriores } from './CiclosAnteriores';
import { EsqueletoDeTarjeta } from './esqueletos';
import { FranjaDeLabor } from './FranjaDeLabor';
import { Tarjeta } from './Tarjeta';
import { TarjetaProduccion } from './TarjetaProduccion';
import { Texto } from './Texto';
import { Vista } from './Vista';

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

/** La labor que toca (RF-03) con un botón para registrarla ya con su tipo elegido (menos pasos, Tesler). */
function TarjetaProximaLabor({
  id,
  alRegistrar,
}: {
  readonly id: string;
  readonly alRegistrar: (tipo: TipoLabor) => void;
}) {
  const proxima = useProximaLabor(id);
  return (
    <Vista
      carga={proxima}
      esqueleto={<EsqueletoDeTarjeta />}
      vacio={{ titulo: 'Sin sugerencia', mensaje: 'El lote no existe.' }}
    >
      {(s) => (
        <Tarjeta>
          <Texto variante="ayuda">Próxima labor sugerida</Texto>
          <FranjaDeLabor tipo={s.tipo} fecha={s.fecha} diasRestantes={s.diasRestantes} />
          <Boton
            titulo={`Registrar ${ETIQUETA_TIPO[s.tipo].toLowerCase()}`}
            icono="add"
            onPress={() => alRegistrar(s.tipo)}
          />
        </Tarjeta>
      )}
    </Vista>
  );
}

/** Carencia, próxima labor, producción y ciclos anteriores: lo que se necesita saber del lote, en ese orden. */
export function ResumenLote({
  id,
  alRegistrar,
}: {
  readonly id: string;
  readonly alRegistrar: (tipo: TipoLabor) => void;
}) {
  return (
    <View className="gap-4">
      <CarenciaVigente id={id} />
      <TarjetaProximaLabor id={id} alRegistrar={alRegistrar} />
      <TarjetaProduccion id={id} />
      <CiclosAnteriores id={id} />
    </View>
  );
}
