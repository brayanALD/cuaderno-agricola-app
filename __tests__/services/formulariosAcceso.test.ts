import {
  esquemaLogin,
  esquemaRecuperar,
  esquemaRegistro,
  valoresAccesoVacios,
} from '@/services/formulariosAcceso';

const mensajesDe = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  resultado.error?.issues.map((i) => i.message) ?? [];

describe('valoresAccesoVacios', () => {
  it('empieza con los dos campos vacíos', () => {
    expect(valoresAccesoVacios()).toEqual({ email: '', password: '' });
  });
});

describe.each([
  ['login', esquemaLogin],
  ['registro', esquemaRegistro],
  ['recuperar', esquemaRecuperar],
])('correo (%s)', (_nombre, esquema) => {
  const clave = { password: 'clave-segura-1', confirmacion: 'clave-segura-1' };

  it('se recorta y se pasa a minúsculas, igual que hace la API', () => {
    const resultado = esquema.safeParse({ email: '  Ana@Correo.COM ', ...clave });

    expect(resultado.data).toMatchObject({ email: 'ana@correo.com' });
  });

  it('vacío pide escribirlo (un solo mensaje)', () => {
    expect(mensajesDe(esquema.safeParse({ email: '   ', ...clave }))).toEqual([
      'Escribe tu correo.',
    ]);
  });

  it.each(['ana', 'ana@', 'ana@correo', '@correo.com', 'ana correo@x.com'])(
    '«%s» no es un correo válido',
    (email) => {
      expect(mensajesDe(esquema.safeParse({ email, ...clave }))).toEqual([
        'Escribe un correo válido.',
      ]);
    },
  );
});

describe('login: contraseña', () => {
  it('solo exige que no esté vacía (la API decide si es correcta)', () => {
    expect(esquemaLogin.safeParse({ email: 'ana@correo.com', password: '1' }).success).toBe(true);
    expect(mensajesDe(esquemaLogin.safeParse({ email: 'ana@correo.com', password: '' }))).toEqual([
      'Escribe tu contraseña.',
    ]);
  });

  it('no recorta los espacios: forman parte de la contraseña', () => {
    const resultado = esquemaLogin.safeParse({ email: 'ana@correo.com', password: ' clave ' });

    expect(resultado.data?.password).toBe(' clave ');
  });
});

describe('registro: contraseña', () => {
  const con = (password: string, confirmacion = password) =>
    esquemaRegistro.safeParse({ email: 'ana@correo.com', password, confirmacion });

  it('acepta de 8 a 128 caracteres', () => {
    expect(con('12345678').success).toBe(true);
    expect(con('a'.repeat(128)).success).toBe(true);
  });

  it('menos de 8 caracteres se rechaza con la regla a la vista', () => {
    expect(mensajesDe(con('1234567'))).toEqual(['La contraseña debe tener al menos 8 caracteres.']);
  });

  it('más de 128 se rechaza', () => {
    expect(mensajesDe(con('a'.repeat(129)))).toEqual([
      'La contraseña debe tener como máximo 128 caracteres.',
    ]);
  });
});

describe('registro: confirmar la contraseña (P14)', () => {
  it('si no coinciden se rechaza, con el mensaje en el campo de confirmación', () => {
    const resultado = esquemaRegistro.safeParse({
      email: 'ana@correo.com',
      password: 'clave-segura-1',
      confirmacion: 'clave-segura-2',
    });

    expect(mensajesDe(resultado)).toEqual(['Las contraseñas no coinciden.']);
    expect(resultado.error?.issues[0]?.path).toEqual(['confirmacion']);
  });

  it('si coinciden entrega solo el correo y la contraseña (sin la confirmación)', () => {
    const resultado = esquemaRegistro.safeParse({
      email: 'ana@correo.com',
      password: 'clave-segura-1',
      confirmacion: 'clave-segura-1',
    });

    expect(resultado.data).toEqual({ email: 'ana@correo.com', password: 'clave-segura-1' });
  });

  it('sin confirmación no pasa', () => {
    const resultado = esquemaRegistro.safeParse({
      email: 'ana@correo.com',
      password: 'clave-segura-1',
    });

    expect(resultado.success).toBe(false);
  });
});
