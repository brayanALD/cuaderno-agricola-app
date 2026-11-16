import { z } from 'zod';

export interface ValoresAcceso {
  email: string;
  password: string;
  /** Solo en el registro: se repite la contraseña para no dejar la cuenta inaccesible por un error al teclear (P14). */
  confirmacion?: string;
}

export const valoresAccesoVacios = (): ValoresAcceso => ({ email: '', password: '' });

/** Mismo tratamiento del correo que la API: se recorta y se pasa a minúsculas antes de validarlo. */
const email = z
  .string()
  .trim()
  .min(1, { error: 'Escribe tu correo.' })
  .toLowerCase()
  .pipe(z.email({ error: 'Escribe un correo válido.' }));

/** Iniciar sesión: la API decide si la contraseña es correcta, aquí solo debe haber una. */
export const esquemaLogin = z.object({
  email,
  password: z.string().min(1, { error: 'Escribe tu contraseña.' }),
});

/** Registro: la regla de la API (sección 9.1), mostrada en el formulario antes de enviar, y la contraseña repetida igual (P14). */
export const esquemaRegistro = z
  .object({
    email,
    password: z
      .string()
      .min(8, { error: 'La contraseña debe tener al menos 8 caracteres.' })
      .max(128, { error: 'La contraseña debe tener como máximo 128 caracteres.' }),
    confirmacion: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmacion, {
    error: 'Las contraseñas no coinciden.',
    path: ['confirmacion'],
  })
  .transform(({ email: correo, password }) => ({ email: correo, password }));

export interface ValoresRecuperar {
  email: string;
}

/** Recuperar la contraseña: solo el correo (la API responde igual exista o no la cuenta). */
export const esquemaRecuperar = z.object({ email });
