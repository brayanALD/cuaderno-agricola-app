import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { View } from 'react-native';
import { esquemaRecuperar, type ValoresRecuperar } from '@/services/formulariosAcceso';
import type { Resultado } from '@/services/resultado';
import { Boton } from '../Boton';
import { Banner } from '../Banner';
import { CampoControlado } from './CampoControlado';
import { aplicarErrores } from './errores';

const CAMPOS = ['email'] as const;

export interface FormularioRecuperarProps {
  readonly alEnviar: (datos: ValoresRecuperar) => Promise<Resultado<unknown>>;
  /** Se llama cuando la API aceptó la petición (exista o no la cuenta). */
  readonly alTerminar: () => void;
}

/** Pide el correo para mandar el enlace de recuperación. No dice si el correo tiene cuenta (la API tampoco). */
export function FormularioRecuperar({ alEnviar, alTerminar }: FormularioRecuperarProps) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<ValoresRecuperar, unknown, ValoresRecuperar>({
    defaultValues: { email: '' },
    resolver: zodResolver(esquemaRecuperar),
  });
  const [general, setGeneral] = useState<string | null>(null);

  const enviar = handleSubmit(async (datos) => {
    setGeneral(null);
    const resultado = await alEnviar(datos);
    if (resultado.ok) alTerminar();
    else setGeneral(aplicarErrores(resultado.errores, setError, CAMPOS));
  });

  return (
    <View className="gap-4">
      <CampoControlado
        control={control}
        name="email"
        etiqueta="Correo electrónico"
        teclado="email-address"
        autoCompletar="email"
        sinCorreccion
      />
      {general === null ? null : <Banner tono="error" icono="alert-circle" texto={general} />}
      <Boton titulo="Enviar enlace" cargando={isSubmitting} onPress={() => void enviar()} />
    </View>
  );
}
