import React from 'react';
// Recomendado: mover estos SVG a src/assets/ y actualizar rutas:
import Rect67 from '../assets/Rectangle 67.svg?react';
import ValiDocuText from '../assets/ValiDocu_text.svg?react';

type Letter = 'v' | 'a' | 'l' | 'i' | 'd' | 'o' | 'c' | 'u';
type LetterMap = Partial<Record<Letter, string>>;

type Props = {
  /** Si true, renderiza Rectangle 67; si false, el wordmark */
  background?: boolean;
  /** Color de fondo (solo aplica cuando background === true) */
  bgcolor?: string;

  /** Colores por letra (se pasan SIEMPRE en ambos modos) */
  colors?: LetterMap;

  /** Dimensiones opcionales */
  width?: number | string;
  height?: number | string;

  className?: string;
};

const DEFAULTS = {
  primary:   '#367015',
  secondary: '#242F40',
  accent:    '#CCA43B',
};

export default function BrandMark({
  background = false,
  bgcolor = DEFAULTS.secondary,
  colors = {
    v: DEFAULTS.primary,
    a: DEFAULTS.secondary,
    l: DEFAULTS.secondary,
    i: DEFAULTS.secondary,
    d: DEFAULTS.secondary,
    o: DEFAULTS.accent,
    c: DEFAULTS.secondary,
    u: DEFAULTS.secondary,
  },
  width = background ? '100%' : 220,
  height = background ? 64 : 'auto',
  className,
}: Props) {
  const styleVars: React.CSSProperties = {
    '--c-v': colors.v,
    '--c-a': colors.a,
    '--c-l': colors.l,
    '--c-i': colors.i,
    '--c-d': colors.d,
    '--c-o': colors.o,
    '--c-c': colors.c,
    '--c-u': colors.u,
  } as React.CSSProperties;

  if (background) {
    // En modo fondo paso las letras + el bg
    return (
      <Rect67
        className={className}
        width={width}
        height={height}
        style={{ ...styleVars, '--c-bg': bgcolor } as React.CSSProperties}
        role="img"
        aria-label="ValiDocu background"
      />
    );
  }

  // Modo wordmark: mismo styleVars (letras) sin bg
  return (
    <ValiDocuText
      className={className}
      width={width}
      height={height}
      style={styleVars}
      role="img"
      aria-label="ValiDocu"
    />
  );
}
