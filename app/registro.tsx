import { useRouter } from 'expo-router';
import { Boton } from '@/components/Boton';
import { FormularioAcceso } from '@/components/formularios/FormularioAcceso';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { useSesion } from '@/context/SesionContext';
import { useReiniciarAlSalir } from '@/hooks/useReiniciarAlSalir';
import { esquemaRegistro } from '@/services/formulariosAcceso';

/** Crear la cuenta (correo y contraseña de 8 a 128 caracteres). Registrarse deja la sesión iniciada. */
export default function Registro() {
  const router = useRouter();
  const vez = useReiniciarAlSalir();
  const { registrar } = useSesion();
  const irAlLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));
  return (
    <Pantalla>
      <Texto variante="titulo">Crea tu cuenta</Texto>
      <Texto variante="ayuda">
        Tus lotes y labores se guardan en este teléfono y se sincronizan con tu cuenta.
      </Texto>
      <FormularioAcceso
        key={vez}
        esquema={esquemaRegistro}
        textoBoton="Crear cuenta"
        autoCompletarPassword="password-new"
        ayudaPassword="Al menos 8 caracteres."
        conConfirmacion
        alEnviar={registrar}
      />
      <Boton titulo="¿Ya tienes cuenta? Inicia sesión" variante="texto" onPress={irAlLogin} />
    </Pantalla>
  );
}
