import type {InputHTMLAttributes, ReactNode} from 'react';
import {joinClasses} from './lib';

export type KaisaToggleProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  description?: ReactNode;
};

export function KaisaToggle({label, description, className, disabled, ...props}: KaisaToggleProps) {
  return (
    <label className={joinClasses('kaisa-toggle', disabled && 'is-disabled', className)}>
      <input type="checkbox" className="kaisa-toggle__input" disabled={disabled} {...props} />
      <span className="kaisa-toggle__track" aria-hidden="true">
        <span className="kaisa-toggle__thumb" />
      </span>
      <span className="kaisa-toggle__copy">
        <span className="kaisa-toggle__label">{label}</span>
        {description ? <span className="kaisa-toggle__desc">{description}</span> : null}
      </span>
    </label>
  );
}
