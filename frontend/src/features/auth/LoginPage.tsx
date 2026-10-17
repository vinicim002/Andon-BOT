import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AlertCircle, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { ApiError } from '../../api';
import { useSession } from '../../app/useSession';
import { BrandSymbol } from '../../design-system/BrandSymbol';
import { formatDate } from '../../lib/format';
import s from './LoginPage.module.css';

export function LoginPage() {
  const { user, signIn } = useSession();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/inbox';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (failure) {
      // Mesma mensagem para usuário inexistente e senha errada, de propósito.
      setError(failure instanceof ApiError && failure.status === 401 ? failure.message : 'Não foi possível entrar agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={s.screen}>
      <aside className={s.showcase} aria-hidden>
        <div className={s.glow} />
        <div className={s.grain} />
        <img className={s.logo} src="/brand/web/andon-logo-dark.png" alt="" />
      </aside>

      <main className={s.formSide}>
        <form className={s.form} onSubmit={submit} noValidate>
          <BrandSymbol className={s.mobileLogo} />
          <h1 className={s.title}>Login</h1>

          {error && (
            <p className={s.error} role="alert">
              <AlertCircle aria-hidden />
              {error}
            </p>
          )}

          <label className="visually-hidden" htmlFor="login-email">
            E-mail
          </label>
          <input
            id="login-email"
            className={s.input}
            type="email"
            placeholder="Email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />

          <label className="visually-hidden" htmlFor="login-password">
            Senha
          </label>
          <div className={s.passwordField}>
            <input
              id="login-password"
              className={s.input}
              type={showPassword ? 'text' : 'password'}
              placeholder="Senha"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className={s.reveal}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <button type="submit" className={s.submit} disabled={submitting || !email.trim() || !password}>
            {submitting && <LoaderCircle className={s.spin} aria-hidden />}
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>

          <a className={s.forgot} href="#esqueci-a-senha">
            Esqueceu a senha?
          </a>
        </form>

        <footer className={s.footer}>
          <span>
            Desenvolvido por Andon <strong>BOT</strong>
          </span>
          <span>Versão: {formatDate(__BUILD_DATE__)}</span>
        </footer>
      </main>
    </div>
  );
}
