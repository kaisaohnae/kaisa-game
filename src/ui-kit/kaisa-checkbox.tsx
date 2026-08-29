import type {InputHTMLAttributes, ReactNode} from 'react';
import {joinClasses} from './lib';

export type KaisaCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  description?: ReactNode;
};

export function KaisaCheckbox({label, description, className, disabled, ...props}: KaisaCheckboxProps) {
  return (
    <label className={joinClasses('kaisa-check', disabled && 'is-disabled', description ? 'kaisa-check--desc' : undefined, className)}>
      <input type="checkbox" className="kaisa-check__input" disabled={disabled} {...props} />
      <span className="kaisa-check__chip">
        <span className="kaisa-check__mark" aria-hidden="true" />
        <span className="kaisa-check__copy">
          <span className="kaisa-check__label">{label}</span>
          {description ? <span className="kaisa-check__desc">{description}</span> : null}
        </span>
      </span>
    </label>
  );
}
