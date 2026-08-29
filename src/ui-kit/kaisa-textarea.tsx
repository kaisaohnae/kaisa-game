import type {TextareaHTMLAttributes} from 'react';
import {joinClasses} from './lib';

export type KaisaTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function KaisaTextarea({
  invalid,
  className,
  disabled,
  readOnly,
  placeholder = ' ',
  ...props
}: KaisaTextareaProps) {
  return (
    <textarea
      className={joinClasses(
        'kaisa-textarea',
        invalid && 'kaisa-textarea--invalid',
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
