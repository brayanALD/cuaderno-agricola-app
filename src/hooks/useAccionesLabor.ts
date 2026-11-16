import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useAcciones } from './useAcciones';

export interface AccionesLabor {
  /** Gesto de mantener presionado y botón «Duplicar»: copia la labor con la fecha de hoy. */
  readonly duplicar: (id: string) => Promise<void>;
  /** Pide confirmación antes de borrar. */
  readonly borrar: (id: string) => void;
  /** Resultado de la última acción, para mostrarlo y anunciarlo. */
  readonly aviso: string | null;
}

/** Acciones sobre una fila de labor, compartidas por la bitácora del lote y la pestaña «Labores». */
export function useAccionesLabor(): AccionesLabor {
  const acciones = useAcciones();
  const [aviso, setAviso] = useState<string | null>(null);

  const duplicar = useCallback(
    async (id: string) => {
      const resultado = await acciones.duplicarLabor(id);
      setAviso(
        resultado.ok ? 'Labor duplicada con la fecha de hoy.' : 'No se pudo duplicar la labor.',
      );
    },
    [acciones],
  );

  const borrar = useCallback(
    (id: string) => {
      Alert.alert('¿Borrar la labor?', 'Esta acción no se puede deshacer.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            void acciones
              .borrarLabor(id)
              .then((borrada) =>
                setAviso(borrada ? 'Labor borrada.' : 'No se pudo borrar la labor.'),
              );
          },
        },
      ]);
    },
    [acciones],
  );

  return { duplicar, borrar, aviso };
}
