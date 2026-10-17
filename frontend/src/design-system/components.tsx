import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';
import type { Tone } from '../domain/labels';
import s from './components.module.css';

const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: ReactNode;
  // Botão só com ícone exige rótulo acessível.
  iconOnlyLabel?: string;
};

export function Button({ variant = 'secondary', icon, iconOnlyLabel, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(s.button, s[variant], iconOnlyLabel && s.iconOnly, className)}
      aria-label={iconOnlyLabel}
      title={iconOnlyLabel}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx(s.badge, s[tone])}>{children}</span>;
}

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/);
  if (!parts[0]) return '#';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ name, size = 32, online }: { name: string; size?: number; online?: boolean }) {
  return (
    <span className={s.avatar} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials(name)}
      {online !== undefined && <span className={cx(s.presence, online && s.online)} />}
    </span>
  );
}

export function LoadingState({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className={s.state} role="status">
      <LoaderCircle className={s.spin} />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className={s.state}>
      <Inbox />
      <span className={s.stateTitle}>{title}</span>
      {description && <span>{description}</span>}
    </div>
  );
}

export function ErrorState({ error }: { error: Error }) {
  return (
    <div className={s.state} role="alert">
      <AlertTriangle />
      <span className={s.stateTitle}>Não foi possível carregar</span>
      <span>{error.message}</span>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className={s.pageHeader}>
      <div>
        <h1 className={s.pageTitle}>{title}</h1>
        {description && <p className={s.pageDescription}>{description}</p>}
      </div>
      {actions}
    </header>
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>{children}</table>
    </div>
  );
}
