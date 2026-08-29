import type {ReactNode} from 'react';
import {joinClasses} from './lib';

export type KaisaFieldProps = {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
};

export function KaisaField({
  label,
  htmlFor,
  required,
  hint,
  error,
  disabled,
  children,
  className,
}: KaisaFieldProps) {
  return (
    <div
      className={joinClasses(
        'kaisa-field',
        error && 'kaisa-field--invalid',
        disabled && 'kaisa-field--disabled',
        className,
      )}
    >
      <div className="kaisa-field__control">
        {label ? (
          <label
            htmlFor={htmlFor}
            className={joinClasses('kaisa-field__label', required && 'kaisa-field__label--required')}
          >
            {label}
          </label>
        ) : null}
        {children}
      </div>
      {error ? <span className="kaisa-field__error">{error}</span> : null}
      {!error && hint ? <span className="kaisa-field__hint">{hint}</span> : null}
    </div>
  );
}
