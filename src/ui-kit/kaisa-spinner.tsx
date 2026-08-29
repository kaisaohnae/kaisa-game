import {joinClasses} from './lib';

export type KaisaSpinnerVariant =
  | 'ring'
  | 'dots'
  | 'bars'
  | 'pulse'
  | 'orbit'
  | 'dash'
  | 'wave'
  | 'diamond';
export type KaisaSpinnerSize = 'sm' | 'md' | 'lg';

export type KaisaSpinnerProps = {
  variant?: KaisaSpinnerVariant;
  uiSize?: KaisaSpinnerSize;
  label?: string;
  className?: string;
};

export function KaisaSpinner({
  variant = 'ring',
  uiSize = 'md',
  label = 'Loading',
  className,
}: KaisaSpinnerProps) {
  const rootClass = joinClasses('kaisa-spinner', `kaisa-spinner--${variant}`, `kaisa-spinner--${uiSize}`, className);

  if (variant === 'dots') {
    return (
      <span className={rootClass} role="status" aria-label={label}>
        <i />
        <i />
        <i />
      </span>
    );
  }

  if (variant === 'bars') {
    return (
      <span className={rootClass} role="status" aria-label={label}>
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }

  if (variant === 'wave') {
    return (
      <span className={rootClass} role="status" aria-label={label}>
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>
    );
  }

  if (variant === 'orbit') {
    return (
      <span className={rootClass} role="status" aria-label={label}>
        <span className="kaisa-spinner__core" />
        <span className="kaisa-spinner__sat" />
      </span>
    );
  }

  if (variant === 'pulse' || variant === 'diamond') {
    return <span className={rootClass} role="status" aria-label={label} />;
  }

  return (
    <span className={rootClass} role="status" aria-label={label}>
      <span className="kaisa-spinner__orbit" />
      {variant === 'ring' ? <span className="kaisa-spinner__orbit kaisa-spinner__orbit--alt" /> : null}
    </span>
  );
}
