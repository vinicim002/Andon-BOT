import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Check, ChevronRight, LayoutDashboard, LogOut, Moon, Settings, Workflow, type LucideIcon } from 'lucide-react';
import { canSeeSettings, useCurrentUser } from '../../app/permissions';
import { useSession } from '../../app/useSession';
import { useTheme } from '../../app/theme';
import { Avatar, LoadingState } from '../../design-system/components';
import { availability as availabilityLabels, pauseReasons } from '../../domain/labels';
import type { Availability, Permission, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import { useChangeAvailability } from './useChangeAvailability';
import s from './MorePage.module.css';

// Aba "Mais" do celular: o que no desktop fica no trilho lateral e no menu da conta.
// Lista simples de toque, porque submenu suspenso (status → motivo da pausa) não funciona bem no dedo.
export function MorePage() {
  const { me, can } = useCurrentUser();
  if (!me) return <LoadingState />;
  return <MoreContent me={me} can={can} />;
}

function MoreContent({ me, can }: { me: User; can: (permission: Permission) => boolean }) {
  const { signOut } = useSession();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const setStatus = useChangeAvailability(me);
  // Os motivos de pausa aparecem só depois de escolher "Em pausa": a lista não nasce longa.
  const [choosingPause, setChoosingPause] = useState(false);

  const shortcuts: { to: string; label: string; description: string; icon: LucideIcon; show: boolean }[] = [
    { to: '/workflows', label: 'Workflows', description: 'Automações e fluxos do atendimento', icon: Workflow, show: can('workflows.manage') },
    { to: '/painel', label: 'Painel', description: 'Indicadores da operação', icon: LayoutDashboard, show: true },
    { to: '/configuracoes', label: 'Configurações', description: 'Filas, canais, integrações, IA e usuários', icon: Settings, show: canSeeSettings(can) },
  ];

  const pick = (next: Availability) => {
    setChoosingPause(false);
    void setStatus(next);
  };

  return (
    <div className={s.page}>
      <h1 className={s.title}>Mais</h1>

      <section className={s.profile}>
        <Avatar name={me.name} size={56} presence={me.availability} />
        <div className={s.profileText}>
          <strong>{me.name}</strong>
          <span>{me.email}</span>
        </div>
      </section>

      <section className={s.group} aria-labelledby="more-status">
        <h2 id="more-status" className={s.groupTitle}>
          Status
        </h2>
        <div className={s.card} role="radiogroup" aria-labelledby="more-status">
          <StatusRow presence="available" current={me.availability} onSelect={() => pick('available')} />
          <StatusRow
            presence="paused"
            current={me.availability}
            detail={me.availability === 'paused' && me.pauseReason ? me.pauseReason : undefined}
            onSelect={() => setChoosingPause((v) => !v)}
          />
          {choosingPause && (
            <div className={s.reasons}>
              {pauseReasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={cx(s.reason, me.availability === 'paused' && me.pauseReason === reason && s.reasonActive)}
                  onClick={() => {
                    setChoosingPause(false);
                    void setStatus('paused', reason);
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          )}
          <StatusRow presence="offline" current={me.availability} onSelect={() => pick('offline')} />
        </div>
      </section>

      <section className={s.group}>
        <div className={s.card}>
          {shortcuts
            .filter((item) => item.show)
            .map(({ to, label, description, icon: Icon }) => (
              <Link key={to} to={to} className={s.row}>
                <span className={s.rowIcon} aria-hidden>
                  <Icon />
                </span>
                <span className={s.rowText}>
                  <strong>{label}</strong>
                  <span>{description}</span>
                </span>
                <ChevronRight className={s.chevron} aria-hidden />
              </Link>
            ))}
        </div>
      </section>

      <section className={s.group}>
        <div className={s.card}>
          <label className={s.row}>
            <span className={s.rowIcon} aria-hidden>
              <Moon />
            </span>
            <span className={s.rowText}>
              <strong>Tema escuro</strong>
              <span>Menos brilho para turnos longos</span>
            </span>
            <input type="checkbox" className={s.switch} checked={theme === 'dark'} onChange={toggleTheme} />
          </label>
          <button
            type="button"
            className={cx(s.row, s.danger)}
            onClick={() => {
              signOut();
              navigate('/login', { replace: true });
            }}
          >
            <span className={s.rowIcon} aria-hidden>
              <LogOut />
            </span>
            <span className={s.rowText}>
              <strong>Sair</strong>
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}

function StatusRow({ presence, current, detail, onSelect }: { presence: Availability; current: Availability; detail?: string; onSelect: () => void }) {
  const selected = presence === current;
  return (
    <button type="button" role="radio" aria-checked={selected} className={s.row} onClick={onSelect}>
      <span className={cx(s.dot, s[`dot-${presence}`])} aria-hidden />
      <span className={s.rowText}>
        <strong>{availabilityLabels[presence].label}</strong>
        <span>{detail ?? availabilityLabels[presence].description}</span>
      </span>
      {selected && <Check className={s.check} aria-hidden />}
    </button>
  );
}
