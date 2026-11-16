import { Banner } from './Banner';

/** Resultado de una acción («Labor duplicada…»): visible y anunciado por el lector de pantalla. */
export function Aviso({ texto }: { readonly texto: string | null }) {
  if (texto === null) return null;
  return <Banner icono="checkmark-circle" texto={texto} />;
}
