import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Banner } from '@/components/Banner';
import { Boton } from '@/components/Boton';
import { FormularioRecuperar } from '@/components/formularios/FormularioRecuperar';
import { Pantalla } from '@/components/Pantalla';
import { Texto } from '@/components/Texto';
import { useSesion } from '@/context/SesionContext';
import { useReiniciarAlSalir } from '@/hooks/useReiniciarAlSalir';

/** Recuperar la contraseña: se escribe el correo y Firebase manda un enlace para crear una nueva (P14). */
export default function Recuperar() {
  const router = useRouter();
  const vez = useReiniciarAlSalir();
  const { recuperarPassword } = useSesion();
  const [enviado, setEnviado] = useState(false);
  const irAlLogin = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <Pantalla>
      <Texto variante="titulo">Recupera tu contraseña</Texto>
      {enviado ? (
        <>
          <Banner
            icono="mail-outline"
            titulo="Revisa tu correo"
            texto="Si ese correo tiene una cuenta, te enviamos un mensaje con el enlace para crear una contraseña nueva. Revisa también la carpeta de spam."
          />
          <Boton titulo="Volver a iniciar sesión" onPress={irAlLogin} />
        </>
      ) : (
        <>
          <Texto variante="ayuda">
            Escribe el correo de tu cuenta. Necesitas conexión a internet.
          </Texto>
          <FormularioRecuperar
            key={vez}
            alEnviar={recuperarPassword}
            alTerminar={() => setEnviado(true)}
          />
          <Boton titulo="Volver a iniciar sesión" variante="texto" onPress={irAlLogin} />
        </>
      )}
    </Pantalla>
  );
}
