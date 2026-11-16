// Comprueba que `contrato/contrato.json` (copia de esta app) sea idéntico al de la API, que es la fuente de verdad (D103).
//
//   CONTRATO_URL=<url del contrato de la API> npm run check:contrato
//
// En el CI la URL sale de la cuenta del repositorio. Sale con 0 si coinciden y con 1 si difieren o no se pudo leer
// el de la API (mejor un aviso ruidoso que dar por bueno algo que no se pudo comprobar).
import { readFileSync } from 'node:fs';

const escribir = (texto) => process.stdout.write(`${texto}\n`);
const url = process.env.CONTRATO_URL;
if (!url) {
  escribir(
    'Falta CONTRATO_URL: la dirección (raw) de contrato/contrato.json en la rama main de la API.',
  );
  process.exit(1);
}

/** Ordena las claves para comparar el contenido y no el formato. */
const canonico = (valor) =>
  Array.isArray(valor)
    ? valor.map(canonico)
    : valor !== null && typeof valor === 'object'
      ? Object.fromEntries(
          Object.keys(valor)
            .sort()
            .map((clave) => [clave, canonico(valor[clave])]),
        )
      : valor;

async function descargar() {
  let ultimoError = 'desconocido';
  for (let intento = 1; intento <= 3; intento += 1) {
    try {
      const respuesta = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (respuesta.ok) return await respuesta.json();
      ultimoError = `la API respondió ${String(respuesta.status)}`;
    } catch (error) {
      ultimoError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(ultimoError);
}

let remoto;
try {
  remoto = await descargar();
} catch (error) {
  escribir(`No se pudo leer el contrato de la API (${error.message}).`);
  process.exit(1);
}

const local = JSON.parse(readFileSync('contrato/contrato.json', 'utf8'));
if (JSON.stringify(canonico(local)) === JSON.stringify(canonico(remoto))) {
  escribir(`El contrato coincide con el de la API (versión ${String(local.version)}).`);
  process.exit(0);
}
escribir(
  `El contrato de la app (versión ${String(local.version)}) NO coincide con el de la API (versión ${String(remoto.version)}).\n` +
    'Copia contrato/contrato.json desde la API y ajusta la app hasta que sus pruebas pasen.',
);
process.exit(1);
