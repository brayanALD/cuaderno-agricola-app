import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Pantalla } from '@/components/Pantalla';

describe('Pantalla: márgenes (H7)', () => {
  it('sin desplazamiento y por defecto deja el margen de 16 px alrededor del contenido', async () => {
    await render(
      <Pantalla desplazable={false}>
        <Text>Hola</Text>
      </Pantalla>,
    );

    expect(screen.getByTestId('pantalla-contenido').props.className).toContain('p-4');
  });

  it('con `relleno={false}` el contenido llega al borde: la lista pone su propio margen y no se duplica', async () => {
    await render(
      <Pantalla desplazable={false} relleno={false}>
        <Text>Hola</Text>
      </Pantalla>,
    );

    const clases = String(screen.getByTestId('pantalla-contenido').props.className);
    expect(clases).not.toContain('p-4');
    expect(clases).not.toContain('gap-4');
    expect(clases).toContain('flex-1');
  });

  it('desplazable (por defecto) sigue con su margen interior', async () => {
    await render(
      <Pantalla>
        <Text>Hola</Text>
      </Pantalla>,
    );

    expect(screen.getByText('Hola')).toBeTruthy();
  });
});
