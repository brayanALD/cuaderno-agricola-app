import { NOMBRE_BASE_ANTIGUA, nombreDeBaseDeUsuario } from '@/db/nombreBase';

describe('nombreDeBaseDeUsuario', () => {
  it('una base por usuario: cuaderno-<uid>.db', () => {
    expect(nombreDeBaseDeUsuario('k3J9xQ2mLpV8aZrT1bYcD4eFgH7i')).toBe(
      'cuaderno-k3J9xQ2mLpV8aZrT1bYcD4eFgH7i.db',
    );
  });

  it('usuarios distintos nunca comparten archivo', () => {
    expect(nombreDeBaseDeUsuario('uid-a')).not.toBe(nombreDeBaseDeUsuario('uid-b'));
  });

  it('conserva las mayúsculas del uid (son parte de su identidad)', () => {
    expect(nombreDeBaseDeUsuario('AbC')).toBe('cuaderno-AbC.db');
  });

  it.each(['', '../otro', 'a/b', 'a\\b', 'a.b', 'con espacio', 'ñandú', 'x'.repeat(129)])(
    'rechaza un uid que no es seguro como nombre de archivo: «%s»',
    (uid) => {
      expect(() => nombreDeBaseDeUsuario(uid)).toThrow('Identificador de usuario no válido.');
    },
  );
});

describe('NOMBRE_BASE_ANTIGUA', () => {
  it('es la base de antes de las cuentas, distinta de cualquier base de usuario', () => {
    expect(NOMBRE_BASE_ANTIGUA).toBe('cuaderno.db');
    expect(nombreDeBaseDeUsuario('uid-a')).not.toBe(NOMBRE_BASE_ANTIGUA);
  });
});
