import type {SVGProps} from 'react';

export type SvgProps = SVGProps<SVGSVGElement>;

export function SoftSvg({children, ...props}: SvgProps) {
  const labeled = Boolean(props['aria-label'] ?? props['aria-labelledby']);
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={labeled ? undefined : true}
      {...props}
    >
      {children}
    </svg>
  );
}

export function Eyes({y = 36}: {y?: number}) {
  return (
    <>
      <circle cx="32" cy={y} r="3.4" fill="#4a3728" />
      <circle cx="48" cy={y} r="3.4" fill="#4a3728" />
      <circle cx="33.3" cy={y - 1.1} r="1.1" fill="#fff" />
      <circle cx="49.3" cy={y - 1.1} r="1.1" fill="#fff" />
    </>
  );
}

export function Blush({y = 44}: {y?: number}) {
  return (
    <>
      <ellipse cx="23" cy={y} rx="5.5" ry="3.2" fill="#ff8a9b" opacity="0.55" />
      <ellipse cx="57" cy={y} rx="5.5" ry="3.2" fill="#ff8a9b" opacity="0.55" />
    </>
  );
}

export function Smile({y = 46}: {y?: number}) {
  return (
    <path
      d={`M34 ${y}c2.8 3.2 9.2 3.2 12 0`}
      stroke="#4a3728"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  );
}
