'use client';

import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {apiPost} from '@/config/api-config';
import {useT} from '@/i18n/locale-context';
import useMemberStore, {type MemberInfo} from '@/store/use-member-store';
import {KaisaButton, KaisaField, KaisaInput} from '@/ui-kit';

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0 1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function MemberSettingsLayer({
  open,
  member,
  onClose
}: {
  open: boolean;
  member: MemberInfo;
  onClose: () => void;
}) {
  const t = useT();
  const withdraw = useMemberStore(s => s.withdraw);
  const [pwd, setPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [withdrawPwd, setWithdrawPwd] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawBusy, setWithdrawBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setPwd('');
    setNewPwd('');
    setNewPwdConfirm('');
    setMessage('');
    setError('');
    setWithdrawPwd('');
    setWithdrawError('');
    setWithdrawBusy(false);
  }, [open]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newPwd !== newPwdConfirm) {
      setError('New passwords do not match.');
      return;
    }
    try {
      const body = await apiPost('bl/change-password', {pwd, newPwd}, 'member');
      setMessage(body.message || 'Password changed.');
      setPwd('');
      setNewPwd('');
      setNewPwdConfirm('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Change failed.');
    }
  };

  const onWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    if (!withdrawPwd) return;
    if (!window.confirm(t('Delete this account? This cannot be undone.'))) return;
    setWithdrawBusy(true);
    try {
      await withdraw(withdrawPwd);
      onClose();
    } catch (err: unknown) {
      setWithdrawError(err instanceof Error ? err.message : 'Could not delete account.');
    } finally {
      setWithdrawBusy(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="kaisa-overlay" role="presentation" onClick={onClose}>
      <div
        className="kaisa-dialog kaisa-dialog--popup member-settings-layer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-settings-title"
        onClick={event => event.stopPropagation()}
      >
        <h3 id="member-settings-title" className="kaisa-dialog__title">
          {t('Account settings')}
        </h3>
        <dl className="member-settings-layer__info">
          <div>
            <dt>{t('Nickname')}</dt>
            <dd>{member.memberName}</dd>
          </div>
          <div>
            <dt>{t('Email')}</dt>
            <dd>{member.email}</dd>
          </div>
        </dl>
        <form className="member-settings-layer__form" onSubmit={save}>
          <p className="member-settings-layer__section">{t('Change password')}</p>
          <KaisaField label={t('Current password')} htmlFor="member-cur-pwd" required>
            <KaisaInput id="member-cur-pwd" type="password" value={pwd} onChange={e => setPwd(e.target.value)} required />
          </KaisaField>
          <KaisaField label={t('New password')} htmlFor="member-new-pwd" required>
            <KaisaInput
              id="member-new-pwd"
              type="password"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              minLength={6}
              required
            />
          </KaisaField>
          <KaisaField label={t('Confirm new password')} htmlFor="member-new-pwd-confirm" required>
            <KaisaInput
              id="member-new-pwd-confirm"
              type="password"
              value={newPwdConfirm}
              onChange={e => setNewPwdConfirm(e.target.value)}
              minLength={6}
              required
            />
          </KaisaField>
          {message ? <p className="auth-card__notice">{t(message)}</p> : null}
          {error ? <p className="form-error">{t(error)}</p> : null}
          <div className="kaisa-dialog__actions">
            <KaisaButton type="button" variant="ghost" onClick={onClose}>
              {t('Close')}
            </KaisaButton>
            <KaisaButton type="submit">{t('Change')}</KaisaButton>
          </div>
        </form>
        <form className="member-settings-layer__danger" onSubmit={onWithdraw}>
          <p className="member-settings-layer__section">{t('Delete account')}</p>
          <p className="member-settings-layer__hint">{t('Enter your password to permanently delete this account.')}</p>
          <KaisaField label={t('Current password')} htmlFor="member-withdraw-pwd" required>
            <KaisaInput
              id="member-withdraw-pwd"
              type="password"
              value={withdrawPwd}
              onChange={e => setWithdrawPwd(e.target.value)}
              required
              autoComplete="current-password"
            />
          </KaisaField>
          {withdrawError ? <p className="form-error">{t(withdrawError)}</p> : null}
          <div className="kaisa-dialog__actions">
            <KaisaButton type="submit" variant="danger" disabled={withdrawBusy || !withdrawPwd}>
              {t('Delete account')}
            </KaisaButton>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

type MemberHeaderActionsProps = {
  member: MemberInfo;
  onLogout: () => void;
};

export default function MemberHeaderActions({member, onLogout}: MemberHeaderActionsProps) {
  const t = useT();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="header-member-bar">
        <span className="header-member-bar__name">{member.memberName}</span>
        <button
          type="button"
          className="header-member-bar__btn"
          aria-label={t('Account settings')}
          onClick={() => setSettingsOpen(true)}
        >
          <SettingsIcon />
        </button>
        <button type="button" className="header-member-bar__btn" aria-label={t('Logout')} onClick={onLogout}>
          <LogoutIcon />
        </button>
      </div>
      <MemberSettingsLayer open={settingsOpen} member={member} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

export {SettingsIcon, LogoutIcon};
