import type {InputHTMLAttributes} from 'react';
import {joinClasses} from './lib';

export type KaisaInputSize = 'sm' | 'md' | 'lg';

export type KaisaInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  uiSize?: KaisaInputSize;
  invalid?: boolean;
};

export function KaisaInput({
  uiSize = 'md',
  invalid,
  className,
  disabled,
  readOnly,
  placeholder = ' ',
  ...props
}: KaisaInputProps) {
  return (
    <input
      className={joinClasses(
        'kaisa-input',
        `kaisa-input--${uiSize}`,
        invalid && 'kaisa-input--invalid',
        disabled && 'kaisa-is-disabled',
        readOnly && 'kaisa-is-readonly',
        className,
      )}
      disabled={disabled}
      readOnly={readOnly}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
}
