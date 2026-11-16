import { render, renderHook, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { EsquemaProvider, useColores, useEsquema } from '@/theme/EsquemaProvider';
import palette from '@/theme/palette.json';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const esquemaDelSistema = jest.requireMock<{ default: jest.Mock }>(
  'react-native/Libraries/Utilities/useColorScheme',
).default;

function Muestra() {
  const esquema = useEsquema();
  const colores = useColores();
  return (
    <Text>
      {esquema}:{colores.background}
    </Text>
  );
}

describe('EsquemaProvider', () => {
  it('usa el tema claro cuando el sistema está en claro', async () => {
    esquemaDelSistema.mockReturnValue('light');

    await render(
      <EsquemaProvider>
        <Muestra />
      </EsquemaProvider>,
    );

    expect(screen.getByText(`light:${palette.light.background}`)).toBeTruthy();
  });

  it('usa el tema oscuro cuando el sistema está en oscuro', async () => {
    esquemaDelSistema.mockReturnValue('dark');

    await render(
      <EsquemaProvider>
        <Muestra />
      </EsquemaProvider>,
    );

    expect(screen.getByText(`dark:${palette.dark.background}`)).toBeTruthy();
  });

  it('si el sistema no declara esquema usa el claro', async () => {
    esquemaDelSistema.mockReturnValue(null);

    await render(
      <EsquemaProvider>
        <Muestra />
      </EsquemaProvider>,
    );

    expect(screen.getByText(`light:${palette.light.background}`)).toBeTruthy();
  });

  it('los hooks funcionan también sin proveedor (siguen el esquema del sistema)', async () => {
    esquemaDelSistema.mockReturnValue('dark');

    const { result } = await renderHook(() => useEsquema());

    expect(result.current).toBe('dark');
  });
});
