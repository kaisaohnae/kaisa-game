import type {InputHTMLAttributes, ReactNode} from 'react';
import {joinClasses} from './lib';

export type KaisaRadioProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  description?: ReactNode;
};

export function KaisaRadio({label, description, className, disabled, ...props}: KaisaRadioProps) {
  return (
    <label className={joinClasses('kaisa-radio', disabled && 'is-disabled', className)}>
      <input type="radio" className="kaisa-radio__input" disabled={disabled} {...props} />
      <span className="kaisa-radio__card">
        <span className="kaisa-radio__mark" aria-hidden="true" />
        <span className="kaisa-radio__copy">
          <span className="kaisa-radio__label">{label}</span>
          {description ? <span className="kaisa-radio__desc">{description}</span> : null}
        </span>
      </span>
    </label>
  );
}

export type KaisaRadioGroupProps = {
  children: ReactNode;
  row?: boolean;
  className?: string;
  invalid?: boolean;
  'aria-label'?: string;
};

export function KaisaRadioGroup({
  children,
  row,
  className,
  invalid,
  'aria-label': ariaLabel,
}: KaisaRadioGroupProps) {
  return (
    <div
      className={joinClasses(
        'kaisa-radio-group',
        row && 'kaisa-radio-group--row',
        invalid && 'kaisa-radio-group--invalid',
        className,
      )}
      role="radiogroup"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
    >
      {children}
    </div>
  );
}
