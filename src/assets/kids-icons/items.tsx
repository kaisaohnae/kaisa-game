import {Blush, Eyes, Smile, SoftSvg, type SvgProps} from './faces';

export function ItemBalloon(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="34" rx="18" ry="22" fill="#ef5350" />
      <ellipse cx="32" cy="26" rx="6" ry="8" fill="#ff8a80" opacity="0.55" />
      <path d="M40 56c0 8 4 14 0 18" stroke="#8d6e63" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M34 54h12l-6 6z" fill="#e53935" />
    </SoftSvg>
  );
}

export function ItemCandy(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M18 32l10 8-10 8 4-8z" fill="#f48fb1" />
      <path d="M62 32l-10 8 10 8-4-8z" fill="#81d4fa" />
      <ellipse cx="40" cy="40" rx="14" ry="12" fill="#fff59d" />
      <path d="M30 36c4 2 12 2 16 0M30 44c4 2 12 2 16 0" stroke="#ff8a65" strokeWidth="2" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function ItemFlower(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="28" r="8" fill="#f8bbd0" />
      <circle cx="28" cy="36" r="8" fill="#f48fb1" />
      <circle cx="52" cy="36" r="8" fill="#f48fb1" />
      <circle cx="32" cy="48" r="8" fill="#f8bbd0" />
      <circle cx="48" cy="48" r="8" fill="#f8bbd0" />
      <circle cx="40" cy="40" r="7" fill="#ffe082" />
      <path d="M40 48v18" stroke="#66bb6a" strokeWidth="4" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function ItemTeddy(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="24" cy="28" r="8" fill="#bcaaa4" />
      <circle cx="56" cy="28" r="8" fill="#bcaaa4" />
      <ellipse cx="40" cy="44" rx="20" ry="18" fill="#a1887f" />
      <ellipse cx="40" cy="48" rx="10" ry="8" fill="#efebe9" />
      <Eyes y={40} />
      <ellipse cx="40" cy="46" rx="2.6" ry="2" fill="#5d4037" />
      <Smile y={54} />
    </SoftSvg>
  );
}

export function ItemCoin(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="40" r="22" fill="#ffd54f" />
      <circle cx="40" cy="40" r="16" fill="#ffe082" stroke="#f9a825" strokeWidth="3" />
      <path d="M40 28v24M34 34h12M34 46h12" stroke="#f9a825" strokeWidth="3" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function ItemSparkle(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 12v16M40 52v16M12 40h16M52 40h16" stroke="#ffd54f" strokeWidth="5" strokeLinecap="round" />
      <path d="M22 22l10 10M48 48l10 10M48 22l-10 10M32 48l-10 10" stroke="#fff59d" strokeWidth="4" strokeLinecap="round" />
      <circle cx="40" cy="40" r="6" fill="#ffe082" />
    </SoftSvg>
  );
}

export function ItemParty(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M40 18l6 18h16l-14 10 6 18-14-10-14 10 6-18-14-10h16z" fill="#ff8a65" />
      <circle cx="18" cy="24" r="4" fill="#42a5f5" />
      <circle cx="62" cy="28" r="4" fill="#66bb6a" />
      <circle cx="22" cy="58" r="4" fill="#ffd54f" />
      <circle cx="58" cy="56" r="4" fill="#ec407a" />
    </SoftSvg>
  );
}

export function ItemQuestion(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="40" r="26" fill="#7e57c2" />
      <path
        d="M32 30c0-6 4-10 10-10s10 4 10 9c0 5-4 7-7 9-2 1-3 3-3 5"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="40" cy="56" r="3.5" fill="#fff" />
    </SoftSvg>
  );
}

export function ItemPalette(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="42" rx="26" ry="22" fill="#ffe0b2" />
      <circle cx="28" cy="34" r="6" fill="#ef5350" />
      <circle cx="44" cy="30" r="6" fill="#42a5f5" />
      <circle cx="54" cy="42" r="6" fill="#66bb6a" />
      <circle cx="34" cy="50" r="6" fill="#ffee58" />
      <circle cx="22" cy="48" r="5" fill="#fff" />
    </SoftSvg>
  );
}

export function ItemBasket(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M22 34h36l-4 28H26z" fill="#ffb74d" />
      <path d="M20 34h40" stroke="#8d6e63" strokeWidth="5" strokeLinecap="round" />
      <path d="M28 34c0-12 24-12 24 0" stroke="#8d6e63" strokeWidth="4" fill="none" />
      <circle cx="34" cy="48" r="4" fill="#ef5350" />
      <circle cx="46" cy="50" r="4" fill="#ffe082" />
    </SoftSvg>
  );
}

export function ItemMap(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M16 20l16 6 16-8 16 6v40l-16-6-16 8-16-6z" fill="#ffe082" />
      <path d="M32 26v40M48 18v40" stroke="#ffcc80" strokeWidth="2" />
      <circle cx="40" cy="40" r="5" fill="#ef5350" />
      <path d="M40 45v8" stroke="#ef5350" strokeWidth="3" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function ItemSword(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M44 14L66 36l-8 8-8-8-14 14-6-6 14-14-8-8z" fill="#90caf9" />
      <path d="M30 46l-8 8" stroke="#8d6e63" strokeWidth="6" strokeLinecap="round" />
      <path d="M18 58l8 8" stroke="#ffd54f" strokeWidth="5" strokeLinecap="round" />
      <circle cx="28" cy="52" r="4" fill="#ffb74d" />
    </SoftSvg>
  );
}

export function ItemBook(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M18 18h20c6 0 10 4 10 10v36c-6-4-12-4-20-2V18z" fill="#42a5f5" />
      <path d="M62 18H42c-6 0-10 4-10 10v36c6-4 12-4 20-2V18z" fill="#1e88e5" />
      <path d="M38 24v36" stroke="#fff" strokeWidth="2" opacity="0.5" />
    </SoftSvg>
  );
}

export function ItemPlus(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="40" r="26" fill="#66bb6a" />
      <path d="M40 24v32M24 40h32" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function ItemMinus(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <circle cx="40" cy="40" r="26" fill="#ef5350" />
      <path d="M24 40h32" stroke="#fff" strokeWidth="8" strokeLinecap="round" />
    </SoftSvg>
  );
}

export function ItemFinger(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <path d="M36 14c4 0 8 4 8 10v20h-8z" fill="#ffcc80" />
      <path d="M28 40h28l-4 24H32z" fill="#ffb74d" />
      <circle cx="48" cy="22" r="5" fill="#ff8a65" opacity="0.7" />
    </SoftSvg>
  );
}

export function ItemPlant(p: SvgProps) {
  return (
    <SoftSvg {...p}>
      <ellipse cx="40" cy="62" rx="18" ry="8" fill="#a1887f" />
      <path d="M40 58V28" stroke="#66bb6a" strokeWidth="5" strokeLinecap="round" />
      <path d="M40 40c-12-2-16-12-14-18M40 34c12 0 16-8 14-14" stroke="#81c784" strokeWidth="6" strokeLinecap="round" />
      <circle cx="40" cy="24" r="6" fill="#ff8a9b" />
    </SoftSvg>
  );
}
