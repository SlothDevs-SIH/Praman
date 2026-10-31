import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth, HOME } from '../lib/auth.jsx';
import { DotBackdrop } from '../components/DotBackdrop.jsx';
import { AuthPanel } from '../components/AuthPanel.jsx';
import { TextAnimate } from '../components/ui/text-animate.jsx';
import { Logo } from '../components/Shell.jsx';

export default function Login() {
  const { user } = useAuth();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search ?? '');
  const initialEmail = params.get('email') || '';
  const startMode = params.get('mode') === 'up' ? 'up' : 'in';

  if (user) {
    const dest = loc.state?.from || HOME[user.role] || '/admin';
    return <Navigate to={dest} replace />;
  }

  return (
    <div className="login-wrap">
      <DotBackdrop />
      <div className="card" style={{ width: 'min(480px, 100%)' }}>
        <div className="mb-4 flex items-center justify-between">
          <Logo size={30} />
          <span className="badge synthetic">Synthetic Demo Registry</span>
        </div>
        <TextAnimate as="h1" animation="blurInUp" by="word" style={{ fontSize: '1.6rem' }}>
          Sign in to Praman
        </TextAnimate>
        <p className="muted mb-3 text-[.88rem]">
          Access the AICTE central repository, institution upload portal, employer verifier or student APAAR wallet.
        </p>
        <AuthPanel
          from={loc.state?.from}
          start={startMode}
          initialEmail={initialEmail}
        />
      </div>
    </div>
  );
}
