import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Tooltip as RadixTooltip } from 'radix-ui';
import { AlertTriangle, Inbox, LoaderCircle } from 'lucide-react';
import type { Tone } from '../domain/labels';
import type { Availability, TagColor } from '../domain/types';
import { cx } from '../lib/cx';
import s from './components.module.css';

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

// Etiqueta no estilo "ponto colorido + nome", usada em contatos e conversas.
export function TagChip({ color, children, onRemove }: { color: TagColor; children: ReactNode; onRemove?: () => void }) {
  return (
    <span className={s.tagChip}>
      <span className={cx(s.tagDot, s[`dot-${color}`])} aria-hidden />
      {children}
      {onRemove && (
        <button type="button" className={s.tagRemove} onClick={onRemove} aria-label={`Remover etiqueta ${children}`}>
          ×
        </button>
      )}
    </span>
  );
}

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s]/gu, '').trim().split(/\s+/);
  if (!parts[0]) return '#';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// Cor estável por nome, para o atendente reconhecer contatos sem foto.
const avatarPalettes = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
function paletteFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return avatarPalettes[Math.abs(hash) % avatarPalettes.length];
}

type AvatarProps = {
  name: string;
  size?: number;
  presence?: Availability;
  // Selo no canto inferior (ex.: canal de origem).
  badge?: ReactNode;
  ring?: boolean;
};

export function Avatar({ name, size = 32, presence, badge, ring }: AvatarProps) {
  return (
    <span
      className={cx(s.avatar, s[paletteFor(name)], ring && s.avatarRing)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials(name)}
      {presence && <span className={cx(s.presence, s[`presence-${presence}`])} />}
      {badge && <span className={s.avatarBadge}>{badge}</span>}
    </span>
  );
}

export function Tooltip({ content, children, side = 'right' }: { content: string; children: ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <RadixTooltip.Root delayDuration={200}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content className={s.tooltip} side={side} sideOffset={6}>
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export const TooltipProvider = RadixTooltip.Provider;

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

// Container padrão das telas comuns (o Inbox ocupa a área inteira e não usa).
export function Page({ children }: { children: ReactNode }) {
  return <div className={s.page}>{children}</div>;
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
