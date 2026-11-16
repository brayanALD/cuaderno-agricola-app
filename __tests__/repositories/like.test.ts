import { patronLike } from '@/repositories/like';

describe('patronLike', () => {
  it('envuelve el texto en %…%', () => {
    expect(patronLike('café')).toBe('%café%');
  });

  it('recorta los espacios de los extremos', () => {
    expect(patronLike('  riego ')).toBe('%riego%');
  });

  it('escapa %, _ y \\ para que se busquen como texto', () => {
    expect(patronLike('100%_a\\b')).toBe('%100\\%\\_a\\\\b%');
  });
});
