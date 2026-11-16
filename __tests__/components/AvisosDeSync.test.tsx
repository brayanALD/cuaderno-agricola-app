import { render, screen } from '@testing-library/react-native';
import { AvisoDeSync } from '@/components/AvisoDeSync';
import { FichaLote } from '@/components/DetalleLote';
import { FilaLabor } from '@/components/FilaLabor';
import { FilaLote } from '@/components/FilaLote';
import { marcarLoteConError } from '@/repositories/loteRepository';
import { crearLote, type LoteConDias } from '@/services/loteService';
import { crearContextoDePrueba, datosLote } from '../helpers/contexto';
import { crearEnvoltorio } from '../helpers/envolver';
import { Raiz } from '../helpers/gestos';
import { AHORA, laborFila, loteFila } from '../helpers/filas';

const AVISO = 'Ya existe otro lote con ese nombre en tu cuenta.';

const lote = (cambios = {}): LoteConDias => ({ ...loteFila(cambios), dias_desde_siembra: 90 });

describe('AvisoDeSync', () => {
  it('sin mensaje no pinta nada', async () => {
    await render(<AvisoDeSync mensaje={null} />);

    expect(screen.toJSON()).toBeNull();
  });

  it('con mensaje dice «Sin sincronizar» y el motivo, y lo anuncia completo al lector de pantalla', async () => {
    await render(<AvisoDeSync mensaje={AVISO} />);

    expect(screen.getByText(`Sin sincronizar: ${AVISO}`)).toBeTruthy();
    expect(screen.getByLabelText(`Sin sincronizar: ${AVISO}`)).toBeTruthy();
  });
});

describe('avisos en las filas', () => {
  it('un lote con aviso lo muestra y lo incluye en lo que lee el lector de pantalla', async () => {
    await render(<FilaLote lote={lote({ sync_error: AVISO })} alAbrir={jest.fn()} />);

    expect(screen.getByText(`Sin sincronizar: ${AVISO}`)).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: `Lote El Mirador, Café, 90 días. Sin sincronizar: ${AVISO}. Abrir`,
      }),
    ).toBeTruthy();
  });

  it('un lote sin aviso queda exactamente como antes', async () => {
    await render(<FilaLote lote={lote({ pending: 0 })} alAbrir={jest.fn()} />);

    expect(screen.queryByText(/Sin sincronizar/)).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Lote El Mirador, Café, 90 días. Abrir' }),
    ).toBeTruthy();
  });

  it('una labor con aviso lo muestra y lo incluye en su descripción accesible', async () => {
    await render(
      <Raiz>
        <FilaLabor
          labor={laborFila({ sync_error: 'El servidor la rechazó: El lote no existe.' })}
          alEditar={jest.fn()}
          alDuplicar={jest.fn()}
          alBorrar={jest.fn()}
        />
      </Raiz>,
    );

    expect(
      screen.getByText('Sin sincronizar: El servidor la rechazó: El lote no existe.'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: /Sin sincronizar: El servidor la rechazó: El lote no existe\.\. Editar$/,
      }),
    ).toBeTruthy();
  });

  it('una labor sin aviso no muestra nada extra', async () => {
    await render(
      <Raiz>
        <FilaLabor
          labor={laborFila()}
          alEditar={jest.fn()}
          alDuplicar={jest.fn()}
          alBorrar={jest.fn()}
        />
      </Raiz>,
    );

    expect(screen.queryByText(/Sin sincronizar/)).toBeNull();
  });
});

describe('aviso en la ficha del lote', () => {
  it('la ficha muestra por qué no se sincronizó', async () => {
    const ctx = await crearContextoDePrueba();
    await crearLote(ctx, datosLote());
    await marcarLoteConError(ctx.db, 'id-1', AHORA, AVISO);
    const Envoltorio = crearEnvoltorio(ctx);

    await render(
      <Envoltorio>
        <FichaLote id="id-1" />
      </Envoltorio>,
    );

    expect(await screen.findByText(`Sin sincronizar: ${AVISO}`)).toBeTruthy();
  });
});
