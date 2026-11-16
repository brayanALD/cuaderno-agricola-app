import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useAcciones } from './useAcciones';

/** Pide confirmación y borra el lote con todas sus labores (D40); `alBorrar` se llama si se borró. */
export function useBorrarLote(id: string, alBorrar: () => void): () => void {
  const { borrarLote } = useAcciones();
  return useCallback(() => {
    Alert.alert('¿Borrar el lote?', 'Se borrarán también todas sus labores.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: () => {
          void borrarLote(id).then((borrado) => {
            if (borrado) alBorrar();
          });
        },
      },
    ]);
  }, [borrarLote, id, alBorrar]);
}
