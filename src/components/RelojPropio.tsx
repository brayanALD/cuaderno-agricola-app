import { useState } from 'react';
import { View } from 'react-native';
import { Boton } from './Boton';
import { BotonIcono } from './BotonIcono';
import { HojaInferior } from './HojaInferior';
import { Texto } from './Texto';

export interface RelojPropioProps {
  readonly visible: boolean;
  readonly titulo: string;
  /** `HH:MM`, 24 horas. */
  readonly valor: string;
  readonly alElegir: (hora: string) => void;
  readonly alCerrar: () => void;
}

const dos = (n: number): string => String(n).padStart(2, '0');

/** Una cifra del reloj con sus flechas de 48 dp: sube y baja de uno en uno y da la vuelta (23 → 00, 59 → 00). */
function Cifra({
  nombre,
  valor,
  maximo,
  paso,
  alCambiar,
}: {
  nombre: string;
  valor: number;
  maximo: number;
  paso: number;
  alCambiar: (valor: number) => void;
}) {
  const mover = (n: number) => alCambiar((((valor + n * paso) % maximo) + maximo) % maximo);
  return (
    <View className="items-center">
      <BotonIcono icono="chevron-up" etiqueta={`Subir ${nombre}`} onPress={() => mover(1)} />
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={`${nombre}: ${dos(valor)}`}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => mover(e.nativeEvent.actionName === 'increment' ? 1 : -1)}
        className="min-w-[96px] items-center rounded-2xl bg-primary-soft px-3 py-2"
      >
        <Texto className="text-[56px] font-bold leading-[64px]">{dos(valor)}</Texto>
      </View>
      <BotonIcono icono="chevron-down" etiqueta={`Bajar ${nombre}`} onPress={() => mover(-1)} />
    </View>
  );
}

/**
 * Reloj digital propio (D108): horas y minutos en cifras grandes con flechas para subir y bajar; los minutos van
 * de 5 en 5 (con la hora ya puesta se afinan a mano). Reemplaza al reloj de agujas de Android, difícil de acertar
 * con un dedo en el campo.
 */
export function RelojPropio({ visible, titulo, valor, alElegir, alCerrar }: RelojPropioProps) {
  const [h = 0, m = 0] = valor.split(':').map(Number);
  const [horas, setHoras] = useState(h);
  const [minutos, setMinutos] = useState(m);
  return (
    <HojaInferior visible={visible} titulo={titulo} alCerrar={alCerrar}>
      <View
        className="flex-row items-center justify-center gap-3"
        accessibilityLabel={`Hora ${dos(horas)}:${dos(minutos)}`}
      >
        <Cifra nombre="Horas" valor={horas} maximo={24} paso={1} alCambiar={setHoras} />
        <Texto className="text-[56px] font-bold">:</Texto>
        <Cifra nombre="Minutos" valor={minutos} maximo={60} paso={5} alCambiar={setMinutos} />
      </View>
      <Boton titulo="Aceptar" onPress={() => alElegir(`${dos(horas)}:${dos(minutos)}`)} />
      <Boton titulo="Cancelar" variante="texto" onPress={alCerrar} />
    </HojaInferior>
  );
}
