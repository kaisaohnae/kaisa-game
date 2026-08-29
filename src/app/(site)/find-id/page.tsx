'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useRef, useState} from 'react';
import {apiPost} from '@/config/api-config';
import {isRecaptchaEnabled, RecaptchaField} from '@/components/auth/recaptcha-field';
import {useT} from '@/i18n/locale-context';
import {KaisaButton, KaisaField, KaisaInput} from '@/ui-kit';

export default function FindIdPage() {
  const router = useRouter();
  const t = useT();
  const recaptchaKeyRef = useRef(0);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [email, setEmail] = useState('');
  const [certNumber, setCertNumber] = useState('');
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
      await apiPost('bl/send-find-id-cert', {email, captcha});
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
    try {
      await apiPost('bl/find-id', {email, certNumber});
      setDone(true);
      setHint('We sent your login ID to your email. Check your inbox.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not find your ID.');
    }
  };

  const canSendCert = Boolean(email) && (!captchaRequired || Boolean(captcha));

  return (
    <div className="auth-page">
      <div className="site-shell">
        <form className="auth-card kaisa-kit" onSubmit={onSubmit}>
          <p className="auth-card__eyebrow">{t('Member')}</p>
          <h1>{t('Find ID')}</h1>
          <p className="muted">{t('Recover your login ID by verifying the email you used to sign up.')}</p>
          <KaisaField label={t('Email')} htmlFor="find-id-email" required>
            <KaisaInput
              id="find-id-email"
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
                <KaisaField label={t('6-digit code')} htmlFor="find-id-cert" required>
                  <KaisaInput
                    id="find-id-cert"
                    value={certNumber}
                    onChange={e => setCertNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                </KaisaField>
              ) : null}
            </>
          ) : null}
          {hint ? <p className="auth-card__notice">{t(hint)}</p> : null}
          {error ? <p className="form-error">{t(error)}</p> : null}
          {!done ? (
            <KaisaButton type="submit" fullWidth disabled={!certSent}>
              {t('Email me my ID')}
            </KaisaButton>
          ) : (
            <KaisaButton type="button" fullWidth onClick={() => router.push('/login/')}>
              {t('Go to login')}
            </KaisaButton>
          )}
          <p className="auth-card__hint">
            <Link href="/login/">{t('Login')}</Link>
            {' · '}
            <Link href="/reset-password/">{t('Forgot password')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
