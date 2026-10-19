import { Navigate, NavLink, Outlet } from 'react-router';
import { ListOrdered, MessageSquareQuote, Smartphone, UserCog, type LucideIcon } from 'lucide-react';
import { useCurrentUser } from '../../app/permissions';
import { EmptyState, LoadingState } from '../../design-system/components';
import type { Permission } from '../../domain/types';
import { cx } from '../../lib/cx';
import s from './Settings.module.css';

type Item = { to: string; label: string; icon: LucideIcon; permission?: Permission; soon?: boolean };

const sections: { title: string; items: Item[] }[] = [
  {
    title: 'Atendimento',
    items: [
      { to: 'filas', label: 'Filas', icon: ListOrdered, permission: 'settings.queues' },
      { to: 'respostas-rapidas', label: 'Respostas rápidas', icon: MessageSquareQuote, permission: 'settings.quick_replies' },
    ],
  },
  {
    title: 'Empresa',
    items: [
      { to: 'usuarios', label: 'Usuários e papéis', icon: UserCog, permission: 'settings.users' },
      { to: 'canais', label: 'Canais', icon: Smartphone, permission: 'settings.users', soon: true },
    ],
  },
];

// Seções visíveis para o papel de quem está logado.
function useVisibleSections() {
  const { can, loading } = useCurrentUser();
  const visible = sections
    .map((section) => ({ ...section, items: section.items.filter((i) => !i.permission || can(i.permission)) }))
    .filter((section) => section.items.length > 0);
  return { visible, loading };
}

export function SettingsLayout() {
  const { visible } = useVisibleSections();
  return (
    <div className={s.layout}>
      <nav className={s.nav} aria-label="Configurações">
        <h1 className={s.navTitle}>Configurações</h1>
        {visible.map((section) => (
          <div key={section.title} className={s.navSection}>
            <span className={s.navSectionTitle}>{section.title}</span>
            {section.items.map(({ to, label, icon: Icon, soon }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cx(s.navLink, isActive && s.navLinkActive)}>
                <Icon aria-hidden />
                {label}
                {soon && <span className={s.soon}>em breve</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className={s.content}>
        <Outlet />
      </div>
    </div>
  );
}

// /configuracoes abre a primeira seção que o papel permite.
export function SettingsHome() {
  const { visible, loading } = useVisibleSections();
  if (loading) return <LoadingState />;
  const first = visible[0]?.items[0];
  if (!first) return <EmptyState title="Sem configurações disponíveis" description="Seu papel não dá acesso a nenhuma configuração." />;
  return <Navigate to={first.to} replace />;
}
