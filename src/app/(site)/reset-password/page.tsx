'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useRef, useState} from 'react';
import {apiPost} from '@/config/api-config';
import {isRecaptchaEnabled, RecaptchaField} from '@/components/auth/recaptcha-field';
import {useT} from '@/i18n/locale-context';
import {KaisaButton, KaisaField, KaisaInput} from '@/ui-kit';

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useT();
  const recaptchaKeyRef = useRef(0);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [email, setEmail] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [certSent, setCertSent] = useState(false);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const captchaRequired = isRecaptchaEnabled();

  const resetCaptcha = () => {
    setCaptcha(null);
    recaptchaKeyRef.current += 1;
    setCaptchaKey(recaptchaKeyRef.current);
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    setCertSent(false);
    setCertNumber('');
    setPwd('');
    setPwdConfirm('');
    setHint('');
    setDone(false);
    if (captcha) resetCaptcha();
  };

  const sendCert = async () => {
    setError('');
    setHint('');
    if (captchaRequired && !captcha) {
      setError('Complete the robot check.');
      return;
    }
    try {
      await apiPost('bl/send-reset-pwd-cert', {email, captcha});
      setCertSent(true);
      setHint(
        'We sent a verification code to your email. Enter it within 5 minutes. Check spam if you do not see it.'
      );
    } catch (err: unknown) {
      setCertSent(false);
      setError(err instanceof Error ? err.message : 'Failed to send verification code.');
      resetCaptcha();
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!certSent) {
      setError('Please request a verification code first.');
      return;
    }
    if (pwd !== pwdConfirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      await apiPost('bl/reset-pwd', {
        email,
        certNumber,
        pwd,
        pwd_confirmation: pwdConfirm,
      });
      setDone(true);
      setHint('Password updated. Sign in with your new password.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    }
  };

  const canSendCert = Boolean(email) && (!captchaRequired || Boolean(captcha));

  return (
    <div className="auth-page">
      <div className="site-shell">
        <form className="auth-card kaisa-kit" onSubmit={onSubmit}>
          <p className="auth-card__eyebrow">{t('Member')}</p>
          <h1>{t('Forgot password')}</h1>
          <p className="muted">{t('Verify your signup email, then set a new password.')}</p>
          <KaisaField label={t('Email')} htmlFor="reset-email" required>
            <KaisaInput
              id="reset-email"
              type="email"
              value={email}
              onChange={e => onEmailChange(e.target.value)}
              required
              disabled={done}
            />
          </KaisaField>
          {!done ? (
            <>
              {captchaRequired ? (
                <RecaptchaField key={captchaKey} hidden={Boolean(captcha)} onChange={setCaptcha} />
              ) : null}
              <KaisaButton type="button" variant="secondary" onClick={sendCert} disabled={!canSendCert}>
                {t('Send verification code')}
              </KaisaButton>
              {certSent ? (
                <>
                  <KaisaField label={t('6-digit code')} htmlFor="reset-cert" required>
                    <KaisaInput
                      id="reset-cert"
                      value={certNumber}
                      onChange={e => setCertNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputMode="numeric"
                      maxLength={6}
                      required
                    />
                  </KaisaField>
                  <KaisaField label={t('New password')} htmlFor="reset-pwd" required>
                    <KaisaInput
                      id="reset-pwd"
                      type="password"
                      value={pwd}
                      onChange={e => setPwd(e.target.value)}
                      minLength={6}
                      required
                    />
                  </KaisaField>
                  <KaisaField label={t('Confirm new password')} htmlFor="reset-pwd-confirm" required>
                    <KaisaInput
                      id="reset-pwd-confirm"
                      type="password"
                      value={pwdConfirm}
                      onChange={e => setPwdConfirm(e.target.value)}
                      minLength={6}
                      required
                    />
                  </KaisaField>
                </>
              ) : null}
            </>
          ) : null}
          {hint ? <p className="auth-card__notice">{t(hint)}</p> : null}
          {error ? <p className="form-error">{t(error)}</p> : null}
          {!done ? (
            <KaisaButton type="submit" fullWidth disabled={!certSent}>
              {t('Change password')}
            </KaisaButton>
          ) : (
            <KaisaButton type="button" fullWidth onClick={() => router.push('/login/')}>
              {t('Go to login')}
            </KaisaButton>
          )}
          <p className="auth-card__hint">
            <Link href="/login/">{t('Login')}</Link>
            {' · '}
            <Link href="/find-id/">{t('Find ID')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
