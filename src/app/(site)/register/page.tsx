'use client';

import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {Suspense, useRef, useState} from 'react';
import {apiPost} from '@/config/api-config';
import {isRecaptchaEnabled, RecaptchaField} from '@/components/auth/recaptcha-field';
import {useT} from '@/i18n/locale-context';
import useMemberStore from '@/store/use-member-store';
import {KaisaButton, KaisaField, KaisaInput} from '@/ui-kit';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useMemberStore(s => s.register);
  const t = useT();
  const recaptchaKeyRef = useRef(0);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [memberName, setMemberName] = useState('');
  const [certNumber, setCertNumber] = useState('');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [certSent, setCertSent] = useState(false);
  const [hint, setHint] = useState('');
  const [error, setError] = useState('');
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
      const normalizedEmail = email.trim().toLowerCase();
      setEmail(normalizedEmail);
      await apiPost('bl/send-cert', {email: normalizedEmail, captcha});
      setCertSent(true);
      setCertNumber('');
      setHint(
        'We sent a verification code to your email. Enter it within 5 minutes. Check spam if you do not see it.'
      );
    } catch (err: unknown) {
      setCertSent(false);
      setError(err instanceof Error ? err.message : 'Failed to send verification code.');
      resetCaptcha();
    }
  };

  const resendCert = () => {
    setCertSent(false);
    setCertNumber('');
    setHint('');
    setError('');
    resetCaptcha();
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
      await register({
        email: email.trim().toLowerCase(),
        pwd,
        pwdConfirm,
        certNumber,
        memberName,
      });
      router.push(searchParams.get('returnUrl') || '/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    }
  };

  const canSendCert = Boolean(email) && (!captchaRequired || Boolean(captcha));

  return (
    <div className="auth-page">
      <div className="site-shell">
        <form className="auth-card kaisa-kit" onSubmit={onSubmit}>
          <p className="auth-card__eyebrow">{t('Member')}</p>
          <h1>{t('Register')}</h1>
          <KaisaField label={t('Email')} htmlFor="reg-email" required>
            <KaisaInput
              id="reg-email"
              type="email"
              value={email}
              onChange={e => onEmailChange(e.target.value)}
              required
              disabled={certSent}
            />
          </KaisaField>
          {!certSent ? (
            <>
              {captchaRequired ? (
                <RecaptchaField key={captchaKey} hidden={Boolean(captcha)} onChange={setCaptcha} />
              ) : null}
              <KaisaButton type="button" variant="secondary" onClick={sendCert} disabled={!canSendCert}>
                {t('Send verification code')}
              </KaisaButton>
            </>
          ) : null}
          {certSent ? (
            <>
              <KaisaField label={t('6-digit code')} htmlFor="reg-cert" required>
                <KaisaInput
                  id="reg-cert"
                  value={certNumber}
                  onChange={e => setCertNumber(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </KaisaField>
              <p className="auth-card__notice">
                {t('If you request a new code, the previous one will no longer work. ')}
                <button type="button" className="text-btn" onClick={resendCert}>
                  {t('Resend')}
                </button>
              </p>
              <KaisaField label={t('Nickname')} htmlFor="reg-nickname" required>
                <KaisaInput
                  id="reg-nickname"
                  value={memberName}
                  onChange={e => setMemberName(e.target.value)}
                  maxLength={50}
                  required
                />
              </KaisaField>
              <KaisaField label={t('Password')} htmlFor="reg-pwd" required>
                <KaisaInput
                  id="reg-pwd"
                  type="password"
                  value={pwd}
                  onChange={e => setPwd(e.target.value)}
                  minLength={6}
                  required
                />
              </KaisaField>
              <KaisaField label={t('Confirm password')} htmlFor="reg-pwd-confirm" required>
                <KaisaInput
                  id="reg-pwd-confirm"
                  type="password"
                  value={pwdConfirm}
                  onChange={e => setPwdConfirm(e.target.value)}
                  minLength={6}
                  required
                />
              </KaisaField>
            </>
          ) : null}
          {hint ? <p className="auth-card__notice">{t(hint)}</p> : null}
          {error ? <p className="form-error">{t(error)}</p> : null}
          <KaisaButton type="submit" fullWidth disabled={!certSent}>
            {t('Sign up')}
          </KaisaButton>
          <p className="auth-card__hint">
            {t('Already have an account? ')}
            <Link href="/login/">{t('Login')}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
