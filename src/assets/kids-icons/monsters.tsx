import {Blush, Eyes, Smile, SoftSvg, type SvgProps} from './faces';

export function MonsterSlime(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M16 52c0-18 10-30 24-30s24 12 24 30c-6 8-42 8-48 0z" fill="#66bb6a" />
      <ellipse cx="28" cy="40" rx="5" ry="8" fill="#fff" />
      <ellipse cx="48" cy="40" rx="5" ry="8" fill="#fff" />
      <circle cx="29" cy="42" r="2.5" fill="#4a3728" />
      <circle cx="49" cy="42" r="2.5" fill="#4a3728" />
      <path d="M32 52c3 3 13 3 16 0" stroke="#2e7d32" strokeWidth="2.2" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function MonsterBat(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M14 40c8-16 14-10 18-4 2-12 14-12 16 0 4-6 10-12 18 4-8 4-14 8-18 8H32c-4 0-10-4-18-8z" fill="#7e57c2" />
      <circle cx="40" cy="42" r="10" fill="#5e35b1" />
      <Eyes y={42} />
      <path d="M36 48h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function MonsterWolf(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="48" rx="22" ry="18" fill="#90a4ae" />
      <path d="M22 28l8 14H22zM58 28l-8 14h8z" fill="#78909c" />
      <ellipse cx="40" cy="52" rx="10" ry="8" fill="#eceff1" />
      <Eyes y={42} />
      <ellipse cx="40" cy="48" rx="3" ry="2.4" fill="#37474f" />
      <Smile y={56} />
    </SoftSvg>
  );
}

export function MonsterDragon(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="48" rx="22" ry="18" fill="#81c784" />
      <path d="M20 26l8 16H20zM60 26l-8 16h8z" fill="#66bb6a" />
      <path d="M40 20l4 10h-8z" fill="#ef5350" />
      <Eyes y={42} />
      <Blush y={50} />
      <path d="M34 50c2 4 10 4 12 0" stroke="#2e7d32" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M58 50c8 2 12 8 8 10" stroke="#66bb6a" strokeWidth="5" strokeLinecap="round" />
    </SoftSvg>
  );
}
