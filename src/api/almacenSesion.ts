export interface UsuarioSesion {
  readonly id: string;
  readonly email: string;
}

/** Lo único que la app recuerda de la sesión: los dos tokens y quién es (el `id` nombra su base local). */
export interface SesionGuardada {
  readonly token: string;
  readonly refreshToken: string;
  readonly usuario: UsuarioSesion;
}

export interface AlmacenSesion {
  /** `null` si no hay sesión o quedó guardada a medias. */
  readonly leer: () => Promise<SesionGuardada | null>;
  readonly guardar: (sesion: SesionGuardada) => Promise<void>;
  readonly borrar: () => Promise<void>;
}

/** Subconjunto de `expo-secure-store` que usamos (así las pruebas usan un doble en memoria). */
export interface AlmacenClaveValor {
  readonly getItemAsync: (clave: string) => Promise<string | null>;
  readonly setItemAsync: (clave: string, valor: string) => Promise<void>;
  readonly deleteItemAsync: (clave: string) => Promise<void>;
}

const CLAVES = {
  token: 'sesion.token',
  refreshToken: 'sesion.refreshToken',
  usuarioId: 'sesion.usuarioId',
  email: 'sesion.email',
} as const;

/**
 * Sesión en el almacén seguro (sección 9.1: tokens en `expo-secure-store`, nunca en AsyncStorage).
 * Cada valor va en su propia clave: así ninguno se acerca al límite de tamaño por valor del almacén.
 */
export function crearAlmacenSesion(claveValor: AlmacenClaveValor): AlmacenSesion {
  return {
    async leer() {
      const [token, refreshToken, id, email] = await Promise.all([
        claveValor.getItemAsync(CLAVES.token),
        claveValor.getItemAsync(CLAVES.refreshToken),
        claveValor.getItemAsync(CLAVES.usuarioId),
        claveValor.getItemAsync(CLAVES.email),
      ]);
      if (token === null || refreshToken === null || id === null || email === null) return null;
      return { token, refreshToken, usuario: { id, email } };
    },
    async guardar(sesion) {
      await Promise.all([
        claveValor.setItemAsync(CLAVES.token, sesion.token),
        claveValor.setItemAsync(CLAVES.refreshToken, sesion.refreshToken),
        claveValor.setItemAsync(CLAVES.usuarioId, sesion.usuario.id),
        claveValor.setItemAsync(CLAVES.email, sesion.usuario.email),
      ]);
    },
    async borrar() {
      await Promise.all(Object.values(CLAVES).map((clave) => claveValor.deleteItemAsync(clave)));
    },
  };
}
