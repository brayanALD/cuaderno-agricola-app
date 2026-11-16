import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, type Control } from 'react-hook-form';
import { View } from 'react-native';
import type { z } from 'zod';
import { valoresAccesoVacios, type ValoresAcceso } from '@/services/formulariosAcceso';
import type { Resultado } from '@/services/resultado';
import type { DatosAcceso } from '@/services/sesionService';
import { Boton } from '../Boton';
import { MensajeError } from '../MensajeError';
import { CampoControlado } from './CampoControlado';
import { aplicarErrores } from './errores';

const CAMPOS = ['email', 'password', 'confirmacion'] as const;

export interface FormularioAccesoProps {
  /** Login (contraseña no vacía) o registro (8–128 caracteres). */
  readonly esquema: z.ZodType<DatosAcceso, ValoresAcceso>;
  readonly textoBoton: string;
  readonly autoCompletarPassword: 'password' | 'password-new';
  readonly ayudaPassword?: string;
  /** Registro: pide repetir la contraseña y comprueba que coincidan (P14). */
  readonly conConfirmacion?: boolean;
  readonly alEnviar: (datos: DatosAcceso) => Promise<Resultado<unknown>>;
}

type ControlAcceso = Control<ValoresAcceso, unknown, DatosAcceso>;

/** Correo y contraseña (y, en el registro, repetirla para no dejar la cuenta inaccesible, P14). */
function CamposAcceso({
  control,
  ayudaPassword,
  autoCompletarPassword,
  conConfirmacion,
}: Pick<FormularioAccesoProps, 'ayudaPassword' | 'autoCompletarPassword'> & {
  readonly control: ControlAcceso;
  readonly conConfirmacion: boolean;
}) {
  return (
    <>
      <CampoControlado
        control={control}
        name="email"
        etiqueta="Correo electrónico"
        teclado="email-address"
        autoCompletar="email"
        sinCorreccion
      />
      <CampoControlado
        control={control}
        name="password"
        etiqueta="Contraseña"
        ayuda={ayudaPassword}
        autoCompletar={autoCompletarPassword}
        secreto
      />
      {conConfirmacion ? (
        <CampoControlado
          control={control}
          name="confirmacion"
          etiqueta="Repite la contraseña"
          secretoDe="la confirmación"
          autoCompletar="password-new"
          secreto
        />
      ) : null}
    </>
  );
}

/**
 * Correo y contraseña para entrar o registrarse. Si todo sale bien no hace nada más: la sesión nueva
 * hace que el layout cambie de pantalla (las rutas protegidas se abren solas).
 */
export function FormularioAcceso({
  esquema,
  textoBoton,
  autoCompletarPassword,
  ayudaPassword,
  conConfirmacion = false,
  alEnviar,
}: FormularioAccesoProps) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ValoresAcceso, unknown, DatosAcceso>({
    defaultValues: conConfirmacion
      ? { ...valoresAccesoVacios(), confirmacion: '' }
      : valoresAccesoVacios(),
    resolver: zodResolver(esquema),
  });
  const [general, setGeneral] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setGeneral(null);
    const resultado = await alEnviar(datos);
    if (!resultado.ok) setGeneral(aplicarErrores(resultado.errores, setError, CAMPOS));
  });

  return (
    <View className="gap-4">
      <CamposAcceso
        control={control}
        ayudaPassword={ayudaPassword}
        autoCompletarPassword={autoCompletarPassword}
        conConfirmacion={conConfirmacion}
      />
      <MensajeError texto={general ?? undefined} />
      <Boton titulo={textoBoton} cargando={isSubmitting} onPress={() => void enviar()} />
    </View>
  );
}
