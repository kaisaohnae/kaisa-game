import {Blush, Eyes, SoftSvg, type SvgProps} from './faces';

export function FruitApple(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 18c0 6 4 10 8 10" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="40" cy="48" rx="20" ry="22" fill="#ef5350" />
      <ellipse cx="32" cy="40" rx="6" ry="8" fill="#ff8a80" opacity="0.55" />
      <ellipse cx="40" cy="20" rx="5" ry="3" fill="#8d6e63" />
    </SoftSvg>
  );
}

export function FruitBanana(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path
        d="M22 28c8-12 28-14 36 2 2 4-2 8-6 8-10-2-18 2-24 10-4 4-10 2-8-4 2-6 2-12 2-16z"
        fill="#ffe082"
      />
      <path d="M24 30c6-4 14-6 22-4" stroke="#ffca28" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="56" cy="30" rx="4" ry="3" fill="#f9a825" />
    </SoftSvg>
  );
}

export function FruitGrape(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 14c2 8 8 12 12 12" stroke="#7cb342" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="36" r="9" fill="#ab47bc" />
      <circle cx="48" cy="36" r="9" fill="#8e24aa" />
      <circle cx="40" cy="48" r="9" fill="#9c27b0" />
      <circle cx="28" cy="52" r="8" fill="#8e24aa" />
      <circle cx="52" cy="52" r="8" fill="#ab47bc" />
      <circle cx="30" cy="34" r="2.5" fill="#e1bee7" opacity="0.7" />
    </SoftSvg>
  );
}

export function FruitOrange(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="44" r="22" fill="#ffa726" />
      <circle cx="40" cy="44" r="22" fill="none" stroke="#fb8c00" strokeWidth="2" strokeDasharray="4 6" />
      <ellipse cx="40" cy="22" rx="6" ry="4" fill="#8d6e63" />
      <path d="M40 18c4 4 10 4 12 2" stroke="#66bb6a" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="30" cy="36" rx="5" ry="7" fill="#ffcc80" opacity="0.55" />
    </SoftSvg>
  );
}

export function FruitStrawberry(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 22c-16 4-22 18-18 30 4 12 14 18 18 18s14-6 18-18c4-12-2-26-18-30z" fill="#ef5350" />
      <path d="M28 22c4-6 10-8 12-8s8 2 12 8" fill="#66bb6a" />
      <circle cx="32" cy="40" r="1.6" fill="#fff59d" />
      <circle cx="44" cy="38" r="1.6" fill="#fff59d" />
      <circle cx="36" cy="50" r="1.6" fill="#fff59d" />
      <circle cx="48" cy="48" r="1.6" fill="#fff59d" />
      <circle cx="40" cy="58" r="1.6" fill="#fff59d" />
    </SoftSvg>
  );
}

export function FruitPeach(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="22" ry="20" fill="#ffab91" />
      <path d="M40 28c0 20 0 28 0 36" stroke="#ff8a65" strokeWidth="2" opacity="0.5" />
      <ellipse cx="30" cy="40" rx="7" ry="9" fill="#ffccbc" opacity="0.6" />
      <path d="M40 22c4 4 10 4 12 2" stroke="#81c784" strokeWidth="3" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function FruitWatermelon(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M14 52a26 26 0 0 1 52 0" fill="#ef5350" />
      <path d="M14 52a26 26 0 0 1 52 0" fill="none" stroke="#43a047" strokeWidth="8" />
      <circle cx="32" cy="44" r="1.8" fill="#4a3728" />
      <circle cx="40" cy="40" r="1.8" fill="#4a3728" />
      <circle cx="48" cy="44" r="1.8" fill="#4a3728" />
      <circle cx="36" cy="50" r="1.5" fill="#4a3728" />
      <circle cx="44" cy="50" r="1.5" fill="#4a3728" />
    </SoftSvg>
  );
}

export function ShapeCircle(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="40" r="24" fill="#42a5f5" />
      <ellipse cx="30" cy="32" rx="8" ry="6" fill="#90caf9" opacity="0.7" />
    </SoftSvg>
  );
}

export function ShapeSquare(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <rect x="16" y="16" width="48" height="48" rx="10" fill="#5c6bc0" />
      <rect x="22" y="22" width="18" height="14" rx="4" fill="#9fa8da" opacity="0.7" />
    </SoftSvg>
  );
}

export function ShapeTriangle(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 14L66 62H14z" fill="#ef5350" />
      <path d="M40 26l10 20H30z" fill="#ff8a80" opacity="0.55" />
    </SoftSvg>
  );
}

export function ShapeStar(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path
        d="M40 10l7.4 15.8 17.2 1.8-13 11.6 3.8 16.8L40 46.8 24.6 56l3.8-16.8-13-11.6 17.2-1.8z"
        fill="#ffd54f"
      />
      <path d="M40 22l3 7h7l-5.5 4.2 2 7L40 36l-6.5 4.2 2-7L30 29h7z" fill="#fff59d" opacity="0.7" />
    </SoftSvg>
  );
}

export function ShapeHeart(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path
        d="M40 66S14 48 14 32c0-10 8-16 16-16 6 0 10 3 10 3s4-3 10-3c8 0 16 6 16 16 0 16-26 34-26 34z"
        fill="#ec407a"
      />
      <ellipse cx="28" cy="30" rx="6" ry="4" fill="#f8bbd0" opacity="0.7" />
    </SoftSvg>
  );
}

export function ShapeDiamond(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 12l22 28-22 28L18 40z" fill="#26c6da" />
      <path d="M40 12l12 28H28z" fill="#80deea" opacity="0.75" />
    </SoftSvg>
  );
}

export function ColorBlob({color, ...p}: SvgProps & {color: string}) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="40" r="24" fill={color} />
      <ellipse cx="30" cy="32" rx="8" ry="6" fill="#fff" opacity="0.35" />
      <Eyes y={40} />
      <Blush y={50} />
      <path d="M34 50c2.5 2.8 9.5 2.8 12 0" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </SoftSvg>
  );
}

export function ColorRed(p: SvgProps) {
  return <ColorBlob color="#ef5350" {...p} />;
}
export function ColorBlue(p: SvgProps) {
  return <ColorBlob color="#42a5f5" {...p} />;
}
export function ColorYellow(p: SvgProps) {
  return <ColorBlob color="#ffee58" {...p} />;
}
export function ColorGreen(p: SvgProps) {
  return <ColorBlob color="#66bb6a" {...p} />;
}
export function ColorOrange(p: SvgProps) {
  return <ColorBlob color="#ff9800" {...p} />;
}
