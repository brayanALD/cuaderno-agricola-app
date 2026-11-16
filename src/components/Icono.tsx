import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useColores } from '@/theme/EsquemaProvider';
import type { TokenColor } from '@/theme/tokens';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

interface IconoProps {
  readonly nombre: NombreIcono;
  readonly tamano?: number;
  /** Token de color de la paleta (nunca un hex suelto). */
  readonly tono?: TokenColor;
}

/** Icono decorativo: el nombre accesible lo da el control que lo contiene, no el dibujo. */
export function Icono({ nombre, tamano = 24, tono = 'text' }: IconoProps) {
  const colores = useColores();
  return (
    <Ionicons
      name={nombre}
      size={tamano}
      color={colores[tono]}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}
