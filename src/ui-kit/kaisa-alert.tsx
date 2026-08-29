'use client';

import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {KaisaButton} from './kaisa-button';

export type KaisaAlertProps = {
  open: boolean;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function KaisaAlert({
  open,
  message,
  confirmText = 'OK',
  cancelText,
  onConfirm,
  onCancel,
}: KaisaAlertProps) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="kaisa-overlay" role="presentation">
      <div className="kaisa-dialog kaisa-dialog--alert" role="alertdialog" aria-live="assertive">
        <p className="kaisa-dialog__message">{message}</p>
        <div className="kaisa-dialog__actions">
          {cancelText ? (
            <KaisaButton variant="ghost" onClick={onCancel}>
              {cancelText}
            </KaisaButton>
          ) : null}
          <KaisaButton variant={cancelText ? 'danger' : 'primary'} onClick={onConfirm ?? onCancel}>
            {confirmText}
          </KaisaButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
