import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {joinClasses} from './lib';
import {KaisaSpinner} from './kaisa-spinner';

export type KaisaButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type KaisaButtonSize = 'sm' | 'md' | 'lg';

export type KaisaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: KaisaButtonVariant;
  uiSize?: KaisaButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
};

export function KaisaButton({
  variant = 'primary',
  uiSize = 'md',
  loading = false,
  fullWidth = false,
  leadingIcon,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: KaisaButtonProps) {
  return (
    <button
      type={type}
      className={joinClasses(
        'kaisa-btn',
        `kaisa-btn--${variant}`,
        `kaisa-btn--${uiSize}`,
        fullWidth && 'kaisa-btn--block',
        loading && 'kaisa-btn--loading',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <KaisaSpinner variant="ring" uiSize="sm" className="kaisa-btn__spinner" /> : leadingIcon}
      <span className="kaisa-btn__label">{children}</span>
    </button>
  );
}
