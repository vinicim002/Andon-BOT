import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useSession } from '../../app/useSession';
import { BrandSymbol } from '../../design-system/BrandSymbol';
import s from './LoginPage.module.css';

// Ativação de acesso a partir do link de convite: define nome e senha e já entra no painel.
export function AcceptInvitePage() {
  const { token = '' } = useParams();
  const invite = useQuery(() => api.findInvite(token), token);

  return (
    <div className={s.screen}>
      <aside className={s.showcase} aria-hidden>
        <div className={s.orb} />
        <div className={s.grain} />
        <div className={s.showcaseContent}>
          <img className={s.logo} src="/brand/web/andon-logo-dark.png" alt="" />
          <p className={s.tagline}>Sua equipe te convidou para o Andon BOT.</p>
        </div>
      </aside>
      <main className={s.formSide}>
        <div className={s.form}>
          <BrandSymbol className={s.symbol} />
          {invite.status === 'loading' ? (
            <LoaderCircle className={s.spin} aria-label="Carregando convite" />
          ) : !invite.data || invite.data.expired ? (
            <>
              <h1 className={s.title}>{invite.data?.expired ? 'Convite expirado' : 'Convite inválido'}</h1>
              <p className={s.subtitle}>
                {invite.data?.expired
                  ? 'Este link passou da validade. Peça um novo convite ao administrador da sua empresa.'
                  : 'Este link não existe ou já foi usado. Se você já ativou o acesso, entre com seu e-mail e senha.'}
              </p>
              <Link to="/login" className={s.submit} style={{ textDecoration: 'none' }}>
                Ir para o login <ArrowRight aria-hidden />
              </Link>
            </>
          ) : (
            <ActivateForm token={token} name={invite.data.name} email={invite.data.email} />
          )}
        </div>
      </main>
    </div>
  );
}

function ActivateForm({ token, name: invitedName, email }: { token: string; name: string; email: string }) {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState(invitedName);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setError('');
    setSubmitting(true);
    try {
      await api.acceptInvite(token, name, password);
      await signIn(email, password);
      navigate('/inbox', { replace: true });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível ativar o acesso.');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <h1 className={s.title}>Ative seu acesso</h1>
      <p className={s.subtitle}>
        Crie a senha para entrar com <strong>{email}</strong>.
      </p>

      {error && (
        <p className={s.error} role="alert">
          <AlertCircle aria-hidden />
          {error}
        </p>
      )}

      <div className={s.field}>
        <label htmlFor="invite-name">Nome</label>
        <input id="invite-name" className={s.input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>
      <div className={s.field}>
        <label htmlFor="invite-password">Senha</label>
        <div className={s.passwordField}>
          <input
            id="invite-password"
            className={s.input}
            type={show ? 'text' : 'password'}
            placeholder="Mínimo de 8 caracteres"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="button" className={s.reveal} onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={show}>
            {show ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </div>
      <div className={s.field}>
        <label htmlFor="invite-confirm">Confirmar senha</label>
        <input
          id="invite-confirm"
          className={s.input}
          type={show ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>

      <button type="submit" className={s.submit} disabled={submitting}>
        {submitting && <LoaderCircle className={s.spin} aria-hidden />}
        {submitting ? 'Ativando…' : 'Ativar e entrar'}
        {!submitting && <ArrowRight aria-hidden />}
      </button>
    </form>
  );
}
