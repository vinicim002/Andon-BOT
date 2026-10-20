import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ListOrdered,
  MessageSquareQuote,
  ScrollText,
  Smartphone,
  Sparkles,
  UserCog,
  Webhook,
  type LucideIcon,
} from 'lucide-react';
import { useCurrentUser } from '../../app/permissions';
import { EmptyState, LoadingState } from '../../design-system/components';
import type { Permission } from '../../domain/types';
import { cx } from '../../lib/cx';
import { useGoBack } from '../../lib/useGoBack';
import { useIsMobile } from '../../lib/useIsMobile';
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
    title: 'Inteligência artificial',
    items: [
      { to: 'conhecimento', label: 'Base de conhecimento', icon: BookOpen, permission: 'settings.knowledge' },
      { to: 'ia', label: 'Agente de IA', icon: Sparkles, permission: 'settings.ai' },
    ],
  },
  {
    title: 'Empresa',
    items: [
      { to: 'usuarios', label: 'Usuários e papéis', icon: UserCog, permission: 'settings.users' },
      { to: 'canais', label: 'Canais', icon: Smartphone, permission: 'settings.channels' },
      { to: 'integracoes', label: 'Integrações', icon: Webhook, permission: 'settings.integrations' },
      { to: 'auditoria', label: 'Auditoria', icon: ScrollText, permission: 'settings.audit' },
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
  const mobile = useIsMobile();
  const goBack = useGoBack();
  const { pathname } = useLocation();
  // No celular é uma tela por vez: a lista de seções em /configuracoes, e cada seção em tela
  // própria com voltar — o padrão das configurações do WhatsApp.
  const atIndex = /^\/configuracoes\/?$/.test(pathname);

  return (
    <div className={cx(s.layout, mobile && (atIndex ? s.layoutIndex : s.layoutSection))}>
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
                <ChevronRight className={s.navChevron} aria-hidden />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className={s.content}>
        {mobile && !atIndex && (
          <button type="button" className={s.sectionBack} onClick={() => goBack('/configuracoes')}>
            <ArrowLeft aria-hidden /> Configurações
          </button>
        )}
        <Outlet />
      </div>
    </div>
  );
}

// /configuracoes abre a primeira seção que o papel permite. No celular não: lá a própria
// lista de seções é a tela inicial (o layout já a mostra).
export function SettingsHome() {
  const { visible, loading } = useVisibleSections();
  const mobile = useIsMobile();
  if (mobile) return null;
  if (loading) return <LoadingState />;
  const first = visible[0]?.items[0];
  if (!first) return <EmptyState title="Sem configurações disponíveis" description="Seu papel não dá acesso a nenhuma configuração." />;
  return <Navigate to={first.to} replace />;
}
