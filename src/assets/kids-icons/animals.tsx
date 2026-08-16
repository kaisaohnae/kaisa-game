import {Blush, Eyes, Smile, SoftSvg, type SvgProps} from './faces';

export function AnimalCat(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="48" rx="22" ry="18" fill="#ffb74d" />
      <path d="M18 28l8 14H18z" fill="#ffb74d" />
      <path d="M62 28l-8 14h8z" fill="#ffb74d" />
      <path d="M20 30l6 10" stroke="#ff8a65" strokeWidth="4" strokeLinecap="round" />
      <path d="M60 30l-6 10" stroke="#ff8a65" strokeWidth="4" strokeLinecap="round" />
      <Eyes y={40} />
      <Blush y={48} />
      <path d="M40 44v4" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 50h8" stroke="#4a3728" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 46h-8M28 50h-7M52 46h8M52 50h7" stroke="#ff8a65" strokeWidth="1.8" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function AnimalDog(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="23" ry="19" fill="#d7a86e" />
      <ellipse cx="18" cy="40" rx="8" ry="11" fill="#c48a4a" transform="rotate(-18 18 40)" />
      <ellipse cx="62" cy="40" rx="8" ry="11" fill="#c48a4a" transform="rotate(18 62 40)" />
      <ellipse cx="40" cy="52" rx="10" ry="8" fill="#f3e5d0" />
      <Eyes y={40} />
      <Blush y={48} />
      <ellipse cx="40" cy="48" rx="3.2" ry="2.4" fill="#4a3728" />
      <Smile y={54} />
    </SoftSvg>
  );
}

export function AnimalRabbit(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="28" cy="22" rx="7" ry="16" fill="#f5e6d3" />
      <ellipse cx="52" cy="22" rx="7" ry="16" fill="#f5e6d3" />
      <ellipse cx="28" cy="22" rx="3.5" ry="10" fill="#ffc0cb" />
      <ellipse cx="52" cy="22" rx="3.5" ry="10" fill="#ffc0cb" />
      <ellipse cx="40" cy="48" rx="22" ry="18" fill="#fff8f0" />
      <Eyes y={44} />
      <Blush y={52} />
      <ellipse cx="40" cy="50" rx="2.6" ry="2" fill="#ff8a9b" />
      <Smile y={55} />
    </SoftSvg>
  );
}

export function AnimalBear(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="22" cy="26" r="10" fill="#a1887f" />
      <circle cx="58" cy="26" r="10" fill="#a1887f" />
      <circle cx="22" cy="26" r="5" fill="#d7ccc8" />
      <circle cx="58" cy="26" r="5" fill="#d7ccc8" />
      <ellipse cx="40" cy="46" rx="24" ry="20" fill="#a1887f" />
      <ellipse cx="40" cy="52" rx="12" ry="9" fill="#efebe9" />
      <Eyes y={42} />
      <Blush y={50} />
      <ellipse cx="40" cy="48" rx="3" ry="2.4" fill="#5d4037" />
      <Smile y={56} />
    </SoftSvg>
  );
}

export function AnimalFrog(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="48" rx="24" ry="18" fill="#81c784" />
      <circle cx="28" cy="30" r="9" fill="#81c784" />
      <circle cx="52" cy="30" r="9" fill="#81c784" />
      <circle cx="28" cy="30" r="4.5" fill="#fff" />
      <circle cx="52" cy="30" r="4.5" fill="#fff" />
      <circle cx="28" cy="30" r="2.4" fill="#4a3728" />
      <circle cx="52" cy="30" r="2.4" fill="#4a3728" />
      <Blush y={48} />
      <path d="M32 50c3 4 13 4 16 0" stroke="#4a3728" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="18" cy="54" rx="6" ry="4" fill="#66bb6a" />
      <ellipse cx="62" cy="54" rx="6" ry="4" fill="#66bb6a" />
    </SoftSvg>
  );
}

export function AnimalChick(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="22" ry="20" fill="#ffe082" />
      <circle cx="40" cy="24" r="4" fill="#ffb300" />
      <Eyes y={42} />
      <Blush y={50} />
      <path d="M40 46l-5 4h10z" fill="#ff9800" />
      <path d="M18 48c-4 2-6 8-2 10M62 48c4 2 6 8 2 10" stroke="#ffb300" strokeWidth="3" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function AnimalFox(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M16 58c2-24 14-36 24-36s22 12 24 36" fill="#ff8a4c" />
      <path d="M20 30l10 14H20z" fill="#ff8a4c" />
      <path d="M60 30l-10 14h10z" fill="#ff8a4c" />
      <path d="M28 58c4-10 10-14 12-14s8 4 12 14" fill="#fff3e0" />
      <Eyes y={42} />
      <Blush y={50} />
      <ellipse cx="40" cy="48" rx="2.8" ry="2.2" fill="#4a3728" />
    </SoftSvg>
  );
}

export function AnimalPanda(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="22" cy="26" r="9" fill="#455a64" />
      <circle cx="58" cy="26" r="9" fill="#455a64" />
      <ellipse cx="40" cy="46" rx="24" ry="20" fill="#fafafa" />
      <ellipse cx="30" cy="40" rx="8" ry="9" fill="#455a64" />
      <ellipse cx="50" cy="40" rx="8" ry="9" fill="#455a64" />
      <circle cx="30" cy="40" r="3" fill="#fff" />
      <circle cx="50" cy="40" r="3" fill="#fff" />
      <circle cx="30" cy="40" r="1.6" fill="#4a3728" />
      <circle cx="50" cy="40" r="1.6" fill="#4a3728" />
      <Blush y={52} />
      <ellipse cx="40" cy="50" rx="3" ry="2.2" fill="#455a64" />
      <Smile y={56} />
    </SoftSvg>
  );
}

export function AnimalPig(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="24" ry="20" fill="#f8bbd0" />
      <circle cx="22" cy="28" r="7" fill="#f48fb1" />
      <circle cx="58" cy="28" r="7" fill="#f48fb1" />
      <Eyes y={40} />
      <ellipse cx="40" cy="50" rx="9" ry="7" fill="#f48fb1" />
      <circle cx="36" cy="50" r="1.8" fill="#c2185b" opacity="0.55" />
      <circle cx="44" cy="50" r="1.8" fill="#c2185b" opacity="0.55" />
      <Blush y={46} />
    </SoftSvg>
  );
}

export function AnimalMonkey(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="23" ry="20" fill="#a1887f" />
      <circle cx="18" cy="38" r="9" fill="#8d6e63" />
      <circle cx="62" cy="38" r="9" fill="#8d6e63" />
      <ellipse cx="40" cy="50" rx="14" ry="12" fill="#ffe0b2" />
      <Eyes y={42} />
      <Blush y={52} />
      <ellipse cx="40" cy="48" rx="3" ry="2.4" fill="#5d4037" />
      <Smile y={56} />
    </SoftSvg>
  );
}

export function AnimalCow(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="48" rx="24" ry="18" fill="#fff8e1" />
      <ellipse cx="28" cy="42" rx="7" ry="6" fill="#5d4037" />
      <ellipse cx="54" cy="52" rx="8" ry="6" fill="#5d4037" />
      <path d="M26 24c-2 8 2 12 6 12M54 24c2 8-2 12-6 12" stroke="#bcaaa4" strokeWidth="5" strokeLinecap="round" />
      <Eyes y={40} />
      <ellipse cx="40" cy="50" rx="8" ry="6" fill="#f8bbd0" />
      <circle cx="37" cy="50" r="1.4" fill="#ad1457" opacity="0.5" />
      <circle cx="43" cy="50" r="1.4" fill="#ad1457" opacity="0.5" />
      <Blush y={46} />
    </SoftSvg>
  );
}

export function AnimalLion(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="44" r="28" fill="#ffb74d" />
      <circle cx="40" cy="44" r="28" fill="none" stroke="#ff9800" strokeWidth="10" strokeDasharray="8 7" />
      <circle cx="40" cy="46" r="18" fill="#ffe082" />
      <Eyes y={42} />
      <Blush y={50} />
      <ellipse cx="40" cy="48" rx="3" ry="2.4" fill="#6d4c41" />
      <Smile y={54} />
    </SoftSvg>
  );
}

export function AnimalTiger(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="46" rx="24" ry="20" fill="#ffb74d" />
      <path d="M20 28l9 14H20zM60 28l-9 14h9z" fill="#ffb74d" />
      <path d="M30 34v8M40 30v10M50 34v8M28 52h8M44 52h8" stroke="#5d4037" strokeWidth="3" strokeLinecap="round" />
      <Eyes y={42} />
      <Blush y={50} />
      <ellipse cx="40" cy="48" rx="3" ry="2.2" fill="#5d4037" />
      <Smile y={55} />
    </SoftSvg>
  );
}
