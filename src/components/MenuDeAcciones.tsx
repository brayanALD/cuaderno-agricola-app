import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { BotonIcono } from './BotonIcono';
import { Icono, type NombreIcono } from './Icono';
import { Texto } from './Texto';

export interface AccionDeMenu {
  readonly titulo: string;
  readonly icono: NombreIcono;
  readonly alPulsar: () => void;
  /** Acción destructiva (borrar): va al final, separada y en rojo. */
  readonly peligro?: boolean;
}

export interface MenuDeAccionesProps {
  /** Nombre accesible del botón ⋮ («Más acciones del lote»). */
  readonly etiqueta: string;
  readonly acciones: readonly AccionDeMenu[];
}

interface Ancla {
  readonly arriba: number;
  readonly derecha: number;
}

const MARGEN = 8;

/** Una opción del menú: 48 dp de alto, icono y texto (el rojo de borrar siempre lleva su icono y su palabra). */
function OpcionDeMenu({ accion, alElegir }: { accion: AccionDeMenu; alElegir: () => void }) {
  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityLabel={accion.titulo}
      onPress={alElegir}
      className="min-h-[48px] flex-row items-center gap-3 px-4 active:bg-surface-muted focus:bg-surface-muted"
    >
      <Icono nombre={accion.icono} tamano={20} tono={accion.peligro ? 'danger' : 'textMuted'} />
      <Texto tono={accion.peligro ? 'peligro' : 'texto'}>{accion.titulo}</Texto>
    </Pressable>
  );
}

/** El menú desplegado: pegado a su botón, con «borrar» separado del resto. */
function Desplegable({
  ancla,
  acciones,
  alElegir,
}: {
  ancla: Ancla;
  acciones: readonly AccionDeMenu[];
  alElegir: (accion: AccionDeMenu) => () => void;
}) {
  return (
    <View
      accessibilityRole="menu"
      accessibilityViewIsModal
      style={{ position: 'absolute', top: ancla.arriba, right: ancla.derecha, elevation: 8 }}
      className="min-w-[232px] rounded-xl border border-divider bg-surface py-2"
    >
      {acciones.map((accion) => (
        <View key={accion.titulo}>
          {accion.peligro ? <View className="my-1 h-px bg-divider" /> : null}
          <OpcionDeMenu accion={accion} alElegir={alElegir(accion)} />
        </View>
      ))}
    </View>
  );
}

/**
 * Botón ⋮ con un menú de acciones (patrón familiar de Android). Agrupa lo que no es frecuente y aleja «borrar»
 * de lo demás (Fitts, D105). Se cierra al elegir, al tocar fuera o con «atrás». Con «reducir movimiento» no
 * se anima.
 */
export function MenuDeAcciones({ etiqueta, acciones }: MenuDeAccionesProps) {
  const [abierto, setAbierto] = useState(false);
  const [ancla, setAncla] = useState<Ancla>({ arriba: 64, derecha: MARGEN });
  const boton = useRef<ComponentRef<typeof View>>(null);
  const { width } = useWindowDimensions();
  const reducido = useReducedMotion();

  const abrir = () => {
    setAbierto(true);
    // El menú nace pegado al botón; si no se puede medir (pruebas), queda en la esquina superior derecha.
    boton.current?.measureInWindow((x: number, y: number, ancho: number, alto: number) =>
      setAncla({ arriba: y + alto, derecha: Math.max(MARGEN, width - (x + ancho)) }),
    );
  };
  const cerrar = () => setAbierto(false);
  const elegir = (accion: AccionDeMenu) => () => {
    cerrar();
    accion.alPulsar();
  };

  return (
    <>
      <View ref={boton} collapsable={false}>
        <BotonIcono icono="ellipsis-vertical" etiqueta={etiqueta} onPress={abrir} />
      </View>
      <Modal
        transparent
        visible={abierto}
        animationType={reducido ? 'none' : 'fade'}
        statusBarTranslucent
        onRequestClose={cerrar}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar el menú"
          onPress={cerrar}
          className="flex-1"
        >
          <Desplegable ancla={ancla} acciones={acciones} alElegir={elegir} />
        </Pressable>
      </Modal>
    </>
  );
}
