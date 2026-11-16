import { useRouter } from 'expo-router';
import { Boton } from '@/components/Boton';
import { FormularioAcceso } from '@/components/formularios/FormularioAcceso';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { useSesion } from '@/context/SesionContext';
import { useReiniciarAlSalir } from '@/hooks/useReiniciarAlSalir';
import { esquemaLogin } from '@/services/formulariosAcceso';

/** Entrar con correo y contraseña. Si sale bien, la sesión nueva abre las pantallas protegidas sola. */
export default function Login() {
  const router = useRouter();
  const vez = useReiniciarAlSalir();
  const { iniciarSesion } = useSesion();
  return (
    <Pantalla>
      <Texto variante="titulo">Inicia sesión</Texto>
      <Texto variante="ayuda">
        Necesitas conexión a internet para iniciar sesión. Después podrás trabajar sin conexión.
      </Texto>
      <FormularioAcceso
        key={vez}
        esquema={esquemaLogin}
        textoBoton="Entrar"
        autoCompletarPassword="password"
        alEnviar={iniciarSesion}
      />
      <Boton
        titulo="¿Olvidaste tu contraseña?"
        variante="texto"
        onPress={() => router.push('/recuperar')}
      />
      <Boton
        titulo="¿No tienes cuenta? Crea una"
        variante="texto"
        onPress={() => router.push('/registro')}
      />
    </Pantalla>
  );
}
