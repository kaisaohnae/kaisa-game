'use client';

import {useEffect} from 'react';
import {createPortal} from 'react-dom';
import {KaisaButton} from './kaisa-button';

export type KaisaPopupProps = {
  open: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  hideOnBackdrop?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
};

export function KaisaPopup({
  open,
  title,
  message,
  confirmText = 'OK',
  cancelText,
  hideOnBackdrop = true,
  onConfirm,
  onCancel,
}: KaisaPopupProps) {
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
    <div
      className="kaisa-overlay"
      role="presentation"
      onClick={() => {
        if (hideOnBackdrop) onCancel?.();
      }}
    >
      <div
        className="kaisa-dialog kaisa-dialog--popup"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h3 className="kaisa-dialog__title">{title}</h3> : null}
        <p className="kaisa-dialog__message">{message}</p>
        <div className="kaisa-dialog__actions">
          {cancelText ? (
            <KaisaButton variant="ghost" onClick={onCancel}>
              {cancelText}
            </KaisaButton>
          ) : null}
          <KaisaButton onClick={onConfirm ?? onCancel}>{confirmText}</KaisaButton>
        </div>
      </div>
    </div>,
    document.body,
  );
}
