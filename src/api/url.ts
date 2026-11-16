/**
 * Dirección pública de la API (`EXPO_PUBLIC_API_URL`). Falla pronto y con un mensaje claro: sin ella la
 * app no puede iniciar sesión ni sincronizar. Quita espacios y la barra final.
 */
export function leerUrlApi(valor: string | undefined): string {
  const url = valor?.trim() ?? '';
  if (url === '') {
    throw new Error(
      'Falta EXPO_PUBLIC_API_URL: copia env.example a .env.local y pon la URL de la API.',
    );
  }
  if (!/^https?:\/\/[^/\s]+/.test(url)) {
    throw new Error('EXPO_PUBLIC_API_URL debe ser una URL http o https.');
  }
  return url.replace(/\/+$/, '');
}
