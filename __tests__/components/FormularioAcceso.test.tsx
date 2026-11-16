import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import {
  FormularioAcceso,
  type FormularioAccesoProps,
} from '@/components/formularios/FormularioAcceso';
import { esquemaLogin, esquemaRegistro } from '@/services/formulariosAcceso';
import { exito, fallo } from '@/services/resultado';

async function montar(cambios: Partial<FormularioAccesoProps> = {}) {
  const props: FormularioAccesoProps = {
    esquema: esquemaLogin,
    textoBoton: 'Entrar',
    autoCompletarPassword: 'password',
    alEnviar: jest.fn().mockResolvedValue(exito(null)),
    ...cambios,
  };
  await render(<FormularioAcceso {...props} />);
  return props;
}

async function escribir(correo: string, clave: string) {
  await fireEvent.changeText(screen.getByLabelText('Correo electrónico'), correo);
  await fireEvent.changeText(screen.getByLabelText('Contraseña'), clave);
}

const pulsar = () => fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

describe('FormularioAcceso', () => {
  it('el correo usa teclado de correo sin mayúsculas ni autocorrección; la contraseña va oculta', async () => {
    await montar();

    const correo = screen.getByLabelText('Correo electrónico');
    const clave = screen.getByLabelText('Contraseña');
    expect(correo.props.keyboardType).toBe('email-address');
    expect(correo.props.autoCapitalize).toBe('none');
    expect(correo.props.autoCorrect).toBe(false);
    expect(correo.props.autoComplete).toBe('email');
    expect(clave.props.secureTextEntry).toBe(true);
    expect(clave.props.autoCapitalize).toBe('none');
    expect(clave.props.autoComplete).toBe('password');
  });

  it('en el registro la contraseña se marca como nueva y muestra la regla', async () => {
    await montar({
      esquema: esquemaRegistro,
      autoCompletarPassword: 'password-new',
      ayudaPassword: 'Al menos 8 caracteres.',
    });

    expect(screen.getByLabelText('Contraseña').props.autoComplete).toBe('password-new');
    expect(screen.getByText('Al menos 8 caracteres.')).toBeTruthy();
  });

  it('vacío no envía y señala cada campo', async () => {
    const { alEnviar } = await montar();

    await pulsar();

    expect(await screen.findByText('Escribe tu correo.')).toBeTruthy();
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy();
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it('envía el correo ya normalizado y la contraseña tal cual', async () => {
    const { alEnviar } = await montar();
    await escribir('  Ana@Correo.com ', 'clave-segura-1');

    await pulsar();

    await waitFor(() =>
      expect(alEnviar).toHaveBeenCalledWith({
        email: 'ana@correo.com',
        password: 'clave-segura-1',
      }),
    );
  });

  it('el registro rechaza una contraseña corta antes de llamar a la API', async () => {
    const { alEnviar } = await montar({ esquema: esquemaRegistro, conConfirmacion: true });
    await escribir('ana@correo.com', '1234567');
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), '1234567');

    await pulsar();

    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres.')).toBeTruthy();
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it('un error del servidor sobre el correo aparece junto al campo', async () => {
    await montar({
      alEnviar: jest.fn().mockResolvedValue(fallo({ email: 'Ese correo ya está registrado.' })),
    });
    await escribir('ana@correo.com', 'clave-segura-1');

    await pulsar();

    expect(await screen.findByText('Ese correo ya está registrado.')).toBeTruthy();
  });

  it('un error general se muestra como alerta y se quita al volver a intentarlo', async () => {
    const alEnviar = jest
      .fn()
      .mockResolvedValueOnce(fallo({ general: 'Correo o contraseña incorrectos.' }))
      .mockResolvedValueOnce(exito(null));
    await montar({ alEnviar });
    await escribir('ana@correo.com', 'clave-incorrecta');

    await pulsar();

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();

    await pulsar();

    await waitFor(() => expect(screen.queryByText('Correo o contraseña incorrectos.')).toBeNull());
    expect(alEnviar).toHaveBeenCalledTimes(2);
  });

  it('mientras envía, el botón queda ocupado e inactivo (no se envía dos veces)', async () => {
    const alEnviar = jest.fn().mockReturnValue(new Promise(() => undefined));
    await montar({ alEnviar });
    await escribir('ana@correo.com', 'clave-segura-1');

    await pulsar();

    expect(
      await screen.findByRole('button', { name: 'Entrar', busy: true, disabled: true }),
    ).toBeTruthy();
    await pulsar();
    expect(alEnviar).toHaveBeenCalledTimes(1);
  });

  it('la contraseña se puede mostrar y volver a ocultar (P14)', async () => {
    await montar();
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);

    await fireEvent.press(screen.getByRole('button', { name: 'Mostrar la contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);

    await fireEvent.press(screen.getByRole('button', { name: 'Ocultar la contraseña' }));
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
  });

  it('solo la contraseña tiene botón de mostrar (el correo no)', async () => {
    await montar();

    expect(screen.getAllByRole('button', { name: /^Mostrar/ })).toHaveLength(1);
  });

  it('en el registro cada ojo dice a qué campo corresponde', async () => {
    await montar({ esquema: esquemaRegistro, conConfirmacion: true });

    expect(screen.getByRole('button', { name: 'Mostrar la contraseña' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mostrar la confirmación' })).toBeTruthy();
  });

  it('sin «conConfirmacion» (login) no hay campo para repetir la contraseña', async () => {
    await montar();

    expect(screen.queryByLabelText('Repite la contraseña')).toBeNull();
  });

  it('con confirmación distinta no envía y lo dice junto al campo', async () => {
    const { alEnviar } = await montar({ esquema: esquemaRegistro, conConfirmacion: true });
    await escribir('ana@correo.com', 'clave-segura-1');
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), 'clave-segura-2');

    await pulsar();

    expect(await screen.findByText('Las contraseñas no coinciden.')).toBeTruthy();
    expect(alEnviar).not.toHaveBeenCalled();
  });

  it('con la confirmación igual envía solo correo y contraseña', async () => {
    const { alEnviar } = await montar({ esquema: esquemaRegistro, conConfirmacion: true });
    await escribir('ana@correo.com', 'clave-segura-1');
    await fireEvent.changeText(screen.getByLabelText('Repite la contraseña'), 'clave-segura-1');

    await pulsar();

    await waitFor(() =>
      expect(alEnviar).toHaveBeenCalledWith({
        email: 'ana@correo.com',
        password: 'clave-segura-1',
      }),
    );
  });
});
