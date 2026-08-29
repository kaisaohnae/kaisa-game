'use client';

import dynamic from 'next/dynamic';
import {useEffect} from 'react';

const ReCAPTCHA = dynamic(() => import('react-google-recaptcha'), {ssr: false});

type RecaptchaFieldProps = {
  onChange: (token: string | null) => void;
  hidden?: boolean;
};

export const isRecaptchaEnabled = () => Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY);

export function RecaptchaField({onChange, hidden = false}: RecaptchaFieldProps) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = typeof reason === 'string' ? reason : reason?.message;
      if (typeof message === 'string' && message.includes('reCAPTCHA Timeout')) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);

  if (!siteKey) return null;

  return (
    <div className={`auth-captcha${hidden ? ' auth-captcha--hidden' : ''}`} aria-hidden={hidden}>
      <ReCAPTCHA sitekey={siteKey} onChange={onChange} />
    </div>
  );
}
