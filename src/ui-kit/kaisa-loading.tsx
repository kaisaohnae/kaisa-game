'use client';

import {createPortal} from 'react-dom';
import {KaisaSpinner, type KaisaSpinnerVariant} from './kaisa-spinner';

export type KaisaLoadingTone = 'light' | 'dark' | 'blur';

export type KaisaLoadingProps = {
  open: boolean;
  variant?: KaisaSpinnerVariant;
  message?: string;
  overlay?: KaisaLoadingTone;
};

export function KaisaLoading({open, variant = 'ring'}: KaisaLoadingProps) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="kaisa-loading" role="status" aria-live="polite" aria-busy="true">
      <KaisaSpinner variant={variant} uiSize="lg" />
    </div>,
    document.body,
  );
}
