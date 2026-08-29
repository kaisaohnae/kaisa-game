import type {SelectHTMLAttributes} from 'react';
import {joinClasses} from './lib';

export type KaisaSelectSize = 'sm' | 'md' | 'lg';

export type KaisaSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  uiSize?: KaisaSelectSize;
  invalid?: boolean;
};

export function KaisaSelect({
  uiSize = 'md',
  invalid,
  className,
  disabled,
  children,
  ...props
}: KaisaSelectProps) {
  return (
    <span className={joinClasses('kaisa-select-wrap', `kaisa-select-wrap--${uiSize}`, disabled && 'is-disabled')}>
      <select
        className={joinClasses(
          'kaisa-select',
          `kaisa-select--${uiSize}`,
          invalid && 'kaisa-select--invalid',
          disabled && 'kaisa-is-disabled',
          className,
        )}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...props}
      >
        {children}
      </select>
    </span>
  );
}
