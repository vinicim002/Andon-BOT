import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, Zap } from 'lucide-react';
import { ApiError, demoAccess } from '../../api';
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

  const enter = async (emailValue: string, passwordValue: string) => {
    if (submitting) return;
    // Validação no envio, não botão desabilitado: o botão fica sempre legível e o erro explica o que falta.
    if (!emailValue.trim() || !passwordValue) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await signIn(emailValue.trim(), passwordValue);
      navigate(from, { replace: true });
    } catch (failure) {
      // 401: mesma mensagem para usuário inexistente e senha errada, de propósito.
      // 403: conta existe mas não pode entrar (desativada, convite pendente) — a API explica o motivo.
      const known = failure instanceof ApiError && (failure.status === 401 || failure.status === 403);
      setError(known ? failure.message : 'Não foi possível entrar agora. Tente novamente em instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void enter(email, password);
  };

  // Atalho de desenvolvimento: preenche os campos à vista e entra, para não digitar a conta de
  // demonstração a cada recarregamento. `import.meta.env.DEV` garante que não vai para o build.
  const enterWithDemoAccess = () => {
    setEmail(demoAccess.email);
    setPassword(demoAccess.password);
    void enter(demoAccess.email, demoAccess.password);
  };

  return (
    <div className={s.screen}>
      <aside className={s.showcase} aria-hidden>
        <div className={s.orb} />
        <div className={s.grain} />
        <div className={s.showcaseContent}>
          <img className={s.logo} src="/brand/web/andon-logo-dark.png" alt="" />
          <p className={s.tagline}>Atendimento, automação e IA no WhatsApp para equipes que não podem parar.</p>
        </div>
      </aside>

      <main className={s.formSide}>
        <form className={s.form} onSubmit={submit} noValidate>
          <BrandSymbol className={s.symbol} />
          <h1 className={s.title}>Boas-vindas de volta</h1>
          <p className={s.subtitle}>Entre com sua conta para acessar o painel.</p>

          {error && (
            <p className={s.error} role="alert">
              <AlertCircle aria-hidden />
              {error}
            </p>
          )}

          <div className={s.field}>
            <label htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              className={s.input}
              type="email"
              placeholder="voce@empresa.com.br"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className={s.field}>
            <div className={s.labelRow}>
              <label htmlFor="login-password">Senha</label>
              <a className={s.forgot} href="#esqueci-a-senha">
                Esqueceu a senha?
              </a>
            </div>
            <div className={s.passwordField}>
              <input
                id="login-password"
                className={s.input}
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
          </div>

          <button type="submit" className={s.submit} disabled={submitting}>
            {submitting && <LoaderCircle className={s.spin} aria-hidden />}
            {submitting ? 'Entrando…' : 'Entrar'}
            {!submitting && <ArrowRight aria-hidden />}
          </button>

          {import.meta.env.DEV && (
            <button type="button" className={s.demoAccess} onClick={enterWithDemoAccess} disabled={submitting}>
              <Zap aria-hidden />
              <span>
                Entrar com a conta de demonstração
                <small>
                  {demoAccess.email} · senha {demoAccess.password}
                </small>
              </span>
            </button>
          )}
        </form>

        <footer className={s.footer}>
          Andon <strong>BOT</strong> · Versão {formatDate(__BUILD_DATE__)}
        </footer>
      </main>
    </div>
  );
}
