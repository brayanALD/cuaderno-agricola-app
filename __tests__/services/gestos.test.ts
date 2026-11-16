import {
  acotarDesplazamiento,
  acotarEscala,
  decidirSnap,
  escalaPorPasos,
  ESCALA_MAX,
  ESCALA_MIN,
  limiteDesplazamiento,
  resistencia,
} from '@/services/gestos';

const base = { ancho: 300, hayAnterior: true, haySiguiente: true, velocidadX: 0 };

describe('decidirSnap (deslizar entre lotes)', () => {
  it('un arrastre largo hacia la izquierda va al lote siguiente', () => {
    expect(decidirSnap({ ...base, traslacionX: -120 })).toBe('siguiente');
  });

  it('un arrastre largo hacia la derecha va al lote anterior', () => {
    expect(decidirSnap({ ...base, traslacionX: 120 })).toBe('anterior');
  });

  it('un arrastre corto y lento vuelve a su sitio', () => {
    expect(decidirSnap({ ...base, traslacionX: -40, velocidadX: -100 })).toBe('quedarse');
  });

  it('un empujón rápido basta aunque la distancia sea corta (velocidad o distancia)', () => {
    expect(decidirSnap({ ...base, traslacionX: -30, velocidadX: -900 })).toBe('siguiente');
    expect(decidirSnap({ ...base, traslacionX: 30, velocidadX: 900 })).toBe('anterior');
  });

  it('la velocidad solo cuenta si va en el mismo sentido que el arrastre', () => {
    expect(decidirSnap({ ...base, traslacionX: -30, velocidadX: 900 })).toBe('quedarse');
  });

  it('la distancia umbral es el 30 % del ancho', () => {
    expect(decidirSnap({ ...base, traslacionX: -89 })).toBe('quedarse');
    expect(decidirSnap({ ...base, traslacionX: -90 })).toBe('siguiente');
  });

  it('sin lote siguiente o anterior se queda donde está', () => {
    expect(decidirSnap({ ...base, traslacionX: -200, haySiguiente: false })).toBe('quedarse');
    expect(decidirSnap({ ...base, traslacionX: 200, hayAnterior: false })).toBe('quedarse');
  });

  it('sin movimiento no cambia de lote', () => {
    expect(decidirSnap({ ...base, traslacionX: 0 })).toBe('quedarse');
  });
});

describe('resistencia (borde elástico)', () => {
  it('con vecino sigue al dedo tal cual', () => {
    expect(resistencia(-80, true)).toBe(-80);
  });

  it('sin vecino cede solo una cuarta parte', () => {
    expect(resistencia(-80, false)).toBe(-20);
    expect(resistencia(80, false)).toBe(20);
  });
});

describe('zoom del visor de foto', () => {
  it('acotarEscala respeta el mínimo y el máximo', () => {
    expect(acotarEscala(0.2)).toBe(ESCALA_MIN);
    expect(acotarEscala(9)).toBe(ESCALA_MAX);
    expect(acotarEscala(2.3)).toBe(2.3);
  });

  it('escalaPorPasos sube o baja de a 0,5 sin salirse del rango', () => {
    expect(escalaPorPasos(1, 1)).toBe(1.5);
    expect(escalaPorPasos(1.5, -1)).toBe(1);
    expect(escalaPorPasos(1, -1)).toBe(ESCALA_MIN);
    expect(escalaPorPasos(ESCALA_MAX, 1)).toBe(ESCALA_MAX);
  });

  it('sin zoom no hay nada que desplazar', () => {
    expect(limiteDesplazamiento(400, 1)).toBe(0);
  });

  it('con zoom se puede desplazar la mitad de lo que crece la imagen', () => {
    expect(limiteDesplazamiento(400, 2)).toBe(200);
    expect(limiteDesplazamiento(400, 3)).toBe(400);
  });

  it('acotarDesplazamiento no deja salir la imagen de los bordes', () => {
    expect(acotarDesplazamiento(500, 400, 2)).toBe(200);
    expect(acotarDesplazamiento(-500, 400, 2)).toBe(-200);
    expect(acotarDesplazamiento(50, 400, 2)).toBe(50);
    expect(acotarDesplazamiento(50, 400, 1)).toBe(0);
  });
});
