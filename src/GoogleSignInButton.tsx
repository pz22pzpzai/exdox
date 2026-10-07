import { useEffect, useRef, useState } from 'react';
import { getGoogleClientId } from './api';

type GoogleIdentity = {
  accounts: { id: {
    initialize: (options: { client_id: string; callback: (response: { credential?: string }) => void; auto_select: boolean }) => void;
    renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; shape: string; width: number }) => void;
  } };
};

declare global {
  interface Window { google?: GoogleIdentity }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google sign-in could not load. Please try again.'));
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function GoogleSignInButton({ onCredential, text = 'continue_with', disabled = false }: {
  onCredential: (credential: string) => void;
  text?: 'continue_with' | 'signin_with' | 'signup_with';
  disabled?: boolean;
}) {
  const target = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID?.trim() || null);
  callback.current = onCredential;

  useEffect(() => {
    if (clientId) return;
    let active = true;
    void getGoogleClientId().then((id) => { if (active) setClientId(id); }).catch(() => {});
    return () => { active = false; };
  }, [clientId]);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    let animationFrame = 0;
    let loadTimeout = 0;
    const showWhenStyled = () => {
      if (!active) return;
      const button = target.current?.querySelector('[role="button"]');
      const label = target.current?.querySelector('#button-label');
      const buttonStyle = button ? getComputedStyle(button) : null;
      if (buttonStyle && parseFloat(buttonStyle.borderRadius) >= 16 && buttonStyle.borderStyle !== 'none' && label && getComputedStyle(label).display === 'none') {
        window.clearTimeout(loadTimeout);
        setReady(true);
        return;
      }
      animationFrame = window.requestAnimationFrame(showWhenStyled);
    };
    void loadGoogleScript().then(() => {
      if (!active || !target.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        auto_select: false,
        callback: ({ credential }) => {
          if (credential) callback.current(credential);
          else setError('Google did not return a sign-in token. Try again.');
        },
      });
      setReady(false);
      target.current.replaceChildren();
      window.google.accounts.id.renderButton(target.current, { theme: 'outline', size: 'large', text, shape: 'pill', width: 288 });
      loadTimeout = window.setTimeout(() => {
        window.cancelAnimationFrame(animationFrame);
        if (active) setError('Google sign-in did not finish loading. Please refresh and try again.');
      }, 10000);
      showWhenStyled();
    }).catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Google sign-in could not load.'); });
    return () => { active = false; window.cancelAnimationFrame(animationFrame); window.clearTimeout(loadTimeout); };
  }, [clientId, text]);

  if (!clientId) return null;
  return <div className={`google-sign-in${ready ? ' google-sign-in-ready' : ''}${disabled ? ' google-sign-in-disabled' : ''}`}><div className="google-sign-in-control" ref={target} style={disabled ? { pointerEvents: 'none' } : undefined} /><span className="muted-copy">Use the same Google account on the website and app.</span>{error ? <div className="error-banner">{error}</div> : null}</div>;
}
