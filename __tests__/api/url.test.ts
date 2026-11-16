import { leerUrlApi } from '@/api/url';

describe('leerUrlApi', () => {
  it.each([
    ['https://mi-api.vercel.app', 'https://mi-api.vercel.app'],
    ['  https://mi-api.vercel.app/  ', 'https://mi-api.vercel.app'],
    ['http://192.168.1.20:3000', 'http://192.168.1.20:3000'],
  ])('acepta «%s»', (entrada, esperada) => {
    expect(leerUrlApi(entrada)).toBe(esperada);
  });

  it.each([undefined, '', '   '])('sin valor (%p) explica qué variable falta', (valor) => {
    expect(() => leerUrlApi(valor)).toThrow('Falta EXPO_PUBLIC_API_URL');
  });

  it.each(['mi-api.vercel.app', 'ftp://mi-api.app', 'javascript:alert(1)', 'https://'])(
    'rechaza «%s» (debe ser una URL http o https)',
    (valor) => {
      expect(() => leerUrlApi(valor)).toThrow('EXPO_PUBLIC_API_URL debe ser una URL http o https');
    },
  );

  it('el error nunca repite el valor recibido', () => {
    expect(() => leerUrlApi('secreto-raro')).not.toThrow(/secreto-raro/);
  });
});
