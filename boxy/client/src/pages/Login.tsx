import { useEffect } from 'react';
import { googleLoginUrl } from '../lib/api';
import { useSearchParams, Link } from 'react-router-dom';

export default function Login() {
  const [params] = useSearchParams();
  const error = params.get('error');

  // hide custom cursor on this page so the white button never gets a blob
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = `* { cursor: auto !important; } .boxy-cursor { display: none !important; }`;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  return (
    <div className="paper-bg grid h-full place-items-center">
      <div className="fade-up panel w-[440px] p-9 shadow-card">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="relative h-8 w-8">
            <div className="absolute inset-0 rounded-md bg-blue/70" />
            <div className="absolute inset-[18%] rounded-sm bg-paper-50" />
          </div>
          <span className="font-display text-2xl text-paper-900">Boxy</span>
        </Link>

        <h1 className="display mt-9 text-3xl text-paper-900">sign in</h1>
        <p className="mt-2 text-sm text-paper-600">Continue with your Google account to start designing.</p>

        {error && (
          <div className="mt-5 rounded-lg border border-rust/40 bg-rust/10 px-3 py-2 text-xs text-rust">
            Authentication failed. Check your Google keys in <code>server/.env</code>.
          </div>
        )}

        <a href={googleLoginUrl} className="btn-primary mt-7 w-full gap-2.5 py-3 text-sm">
          <svg width="17" height="17" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </a>
        <p className="mt-5 text-center text-xs text-paper-500">no password · we never store credentials</p>
      </div>
    </div>
  );
}
