import { useEffect, useRef } from 'react';

// Cloudflare Turnstile widget (used on login, like the reference site). Renders nothing without a site key.
export default function Turnstile({ siteKey, onToken }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!siteKey) return;
    let id;
    const mount = () => {
      if (!ref.current || !window.turnstile) return;
      id = window.turnstile.render(ref.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken(null) });
    };
    if (window.turnstile) mount();
    else {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true; s.onload = mount;
      document.head.appendChild(s);
    }
    return () => { try { window.turnstile?.remove(id); } catch { /* ignore */ } };
  }, [siteKey, onToken]);
  return siteKey ? <div ref={ref} className="my-2" /> : null;
}
