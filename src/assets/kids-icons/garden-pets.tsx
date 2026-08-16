import {Blush, Eyes, Smile, SoftSvg, type SvgProps} from './faces';

export function GardenHole(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="48" rx="24" ry="12" fill="#8d6e63" />
      <ellipse cx="40" cy="48" rx="16" ry="7" fill="#5d4037" />
    </SoftSvg>
  );
}

export function GardenSeed(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="54" rx="20" ry="8" fill="#a1887f" />
      <ellipse cx="40" cy="40" rx="8" ry="12" fill="#8d6e63" />
      <path d="M40 28c4 6 4 12 0 16" stroke="#6d4c41" strokeWidth="2" />
    </SoftSvg>
  );
}

export function GardenSprout(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="62" rx="18" ry="6" fill="#a1887f" />
      <path d="M40 58V34" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 40c-10-2-14-10-12-16M40 36c10 0 14-8 12-14" stroke="#81c784" strokeWidth="5" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function GardenLeaf(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="62" rx="18" ry="6" fill="#a1887f" />
      <path d="M40 58V30" stroke="#43a047" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="28" cy="36" rx="12" ry="8" fill="#66bb6a" transform="rotate(-30 28 36)" />
      <ellipse cx="52" cy="34" rx="12" ry="8" fill="#81c784" transform="rotate(30 52 34)" />
    </SoftSvg>
  );
}

export function GardenBloom(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="64" rx="16" ry="5" fill="#a1887f" />
      <path d="M40 60V36" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="40" cy="24" r="7" fill="#ffe082" />
      <circle cx="28" cy="30" r="7" fill="#f8bbd0" />
      <circle cx="52" cy="30" r="7" fill="#f8bbd0" />
      <circle cx="32" cy="18" r="7" fill="#f48fb1" />
      <circle cx="48" cy="18" r="7" fill="#f48fb1" />
    </SoftSvg>
  );
}

export function GardenTulip(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 70V38" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 50c-10 2-12 10-8 14M40 50c10 2 12 10 8 14" stroke="#81c784" strokeWidth="3" />
      <path d="M28 38c0-14 6-22 12-22s12 8 12 22c-4-4-8-4-12-2-4-2-8-2-12 2z" fill="#ec407a" />
    </SoftSvg>
  );
}

export function GardenSunflower(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 70V44" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="40" cy="30" r="10" fill="#6d4c41" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <ellipse
          key={deg}
          cx="40"
          cy="30"
          rx="7"
          ry="12"
          fill="#ffd54f"
          transform={`rotate(${deg} 40 30) translate(0 -14)`}
        />
      ))}
      <circle cx="40" cy="30" r="8" fill="#5d4037" />
    </SoftSvg>
  );
}

export function GardenCarrot(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 22c8 10 12 28 8 42-8 4-16 4-16 0-4-14 0-32 8-42z" fill="#ff9800" />
      <path d="M34 20c0-8 4-12 6-12s6 4 6 12" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" />
      <path d="M32 34h16M30 44h20M32 54h16" stroke="#fb8c00" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </SoftSvg>
  );
}

export function PetEgg(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="44" rx="18" ry="24" fill="#ffe082" />
      <ellipse cx="40" cy="44" rx="18" ry="24" fill="none" stroke="#ffca28" strokeWidth="3" strokeDasharray="6 5" />
      <Eyes y={42} />
      <Blush y={52} />
      <Smile y={54} />
    </SoftSvg>
  );
}

export function PetBaby(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="20" ry="18" fill="#ffe082" />
      <Eyes y={42} />
      <Blush y={50} />
      <path d="M40 46l-4 3h8z" fill="#ff9800" />
      <path d="M20 48c-3 1-4 6-1 7M60 48c3 1 4 6 1 7" stroke="#ffb300" strokeWidth="3" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function PetKid(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="22" ry="18" fill="#fff8e1" />
      <path d="M24 30c2-10 10-14 16-14s14 4 16 14" fill="#ffcc80" />
      <Eyes y={42} />
      <Blush y={50} />
      <path d="M40 46l-5 4h10z" fill="#ff9800" />
      <path d="M18 50c-4 2-5 8-1 9M62 50c4 2 5 8 1 9" stroke="#ffb74d" strokeWidth="3.5" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function PetBig(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="48" rx="18" ry="14" fill="#ffe0b2" />
      <circle cx="40" cy="30" r="14" fill="#ffe0b2" />
      <path d="M20 28c-8-8-4-16 2-14M60 28c8-8 4-16-2-14" stroke="#ffb74d" strokeWidth="5" strokeLinecap="round" />
      <Eyes y={30} />
      <Blush y={38} />
      <path d="M40 34l-4 3h8z" fill="#ff9800" />
      <path d="M18 48c-6 4-4 14 4 12M62 48c6 4 4 14-4 12" stroke="#ffb74d" strokeWidth="4" strokeLinecap="round" />
    </SoftSvg>
  );
}

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
