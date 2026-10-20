import { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { Bell, Check, LayoutDashboard, LogOut, Menu, MessagesSquare, Moon, Settings, Sun, Ticket, Users, Workflow, type LucideIcon } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { canSeeSettings, useCurrentUser } from '../../app/permissions';
import { useSession } from '../../app/useSession';
import { useTheme } from '../../app/theme';
import { BrandSymbol } from '../../design-system/BrandSymbol';
import { Avatar, Tooltip, TooltipProvider } from '../../design-system/components';
import { availability as availabilityLabels, pauseReasons } from '../../domain/labels';
import type { Availability, Permission, User } from '../../domain/types';
import { visibleConversations } from '../../features/inbox/inboxFilters';
import { cx } from '../../lib/cx';
import { useChangeAvailability } from './useChangeAvailability';
import s from './AppShell.module.css';

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number; permission?: Permission };

// Grupos separados por divisória, como na referência: operação, cadastro, automação/gestão.
const navigation: NavItem[][] = [
  [{ to: '/inbox', label: 'Atendimentos', icon: MessagesSquare }],
  [
    { to: '/tickets', label: 'Tickets', icon: Ticket, permission: 'tickets.view' },
    { to: '/contatos', label: 'Contatos', icon: Users, permission: 'contacts.view' },
  ],
  [
    { to: '/workflows', label: 'Workflows', icon: Workflow, permission: 'workflows.manage' },
    { to: '/painel', label: 'Painel', icon: LayoutDashboard },
  ],
];

// No celular cabem quatro abas com rótulo, como nos apps de mensagem. O que é de gestão
// (workflows, painel, configurações, status, tema) vai para "Mais".
const mobileTabs: NavItem[] = [
  { to: '/inbox', label: 'Atendimentos', icon: MessagesSquare },
  { to: '/tickets', label: 'Tickets', icon: Ticket, permission: 'tickets.view' },
  { to: '/contatos', label: 'Contatos', icon: Users, permission: 'contacts.view' },
  { to: '/mais', label: 'Mais', icon: Menu },
];

// Telas de detalhe ocupam o celular inteiro, sem as abas — como uma conversa no WhatsApp.
// Elas têm seta de voltar própria.
function isDetailScreen(pathname: string, search: string) {
  if (pathname === '/inbox') return new URLSearchParams(search).has('c');
  return /^\/(tickets|contatos|workflows|configuracoes)\/.+/.test(pathname);
}

function RailLink({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <Tooltip content={item.label}>
      {/* className em string: o Tooltip (asChild) mescla classes e não aceita a forma de função do NavLink.
          O item ativo é estilizado pelo aria-current="page" que o NavLink já aplica. */}
      <NavLink to={item.to} className={s.railButton} aria-label={item.label}>
        <Icon aria-hidden />
        {item.badge ? <span className={s.railBadge}>{item.badge}</span> : null}
      </NavLink>
    </Tooltip>
  );
}

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useSession();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  // Disponibilidade, papel e status mudam durante o uso; por isso o usuário vem da API, não da sessão.
  const { me, can } = useCurrentUser();
  const canSettings = canSeeSettings(can);

  // Acesso desativado enquanto a pessoa estava logada: sai na hora.
  useEffect(() => {
    if (me && me.status !== 'active') {
      signOut();
      navigate('/login', { replace: true });
    }
  }, [me, signOut, navigate]);

  return (
    <TooltipProvider>
      <div className={cx(s.shell, isDetailScreen(pathname, search) && s.detail)}>
        <nav className={s.rail} aria-label="Navegação principal">
          <BrandSymbol className={s.brand} />

          <Tooltip content="Notificações">
            <button type="button" className={s.railButton} aria-label="Notificações (1 nova)">
              <Bell aria-hidden />
              <span className={s.railBadge}>1</span>
            </button>
          </Tooltip>

          {navigation
            .map((group) => group.filter((item) => !item.permission || can(item.permission)))
            .map((group, index) => (
              <div key={index} className={s.railGroup}>
                {group.map((item) => (
                  <RailLink key={item.to} item={item} />
                ))}
              </div>
            ))}

          <div className={s.railBottom}>
            <Tooltip content={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
              <button type="button" className={s.railButton} onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}>
                {theme === 'dark' ? <Sun aria-hidden /> : <Moon aria-hidden />}
              </button>
            </Tooltip>
            {canSettings && <RailLink item={{ to: '/configuracoes', label: 'Configurações', icon: Settings }} />}
            {me && <AccountMenu me={me} />}
          </div>
        </nav>

        <main className={s.content}>
          <Outlet />
        </main>

        {me && <TabBar me={me} can={can} />}
      </div>
    </TooltipProvider>
  );
}

// "Mais" fica ativa também nas telas que só se alcançam por ela.
const tabSections: Record<string, string[]> = { '/mais': ['/mais', '/configuracoes', '/workflows', '/painel'] };

function TabBar({ me, can }: { me: User; can: (p: Permission) => boolean }) {
  const { pathname } = useLocation();
  // Contador de conversas não lidas na aba, como o "26" das referências. Usa a mesma regra de
  // visibilidade da lista: um atendente não vê contagem de filas que não são dele.
  const data = useQuery(() => Promise.all([api.conversations(), api.queues()]));
  const unread = data.data
    ? visibleConversations(data.data[0], me.id, data.data[1], can('conversations.view_all')).filter((c) => c.unreadCount > 0).length
    : 0;
  const isActive = (to: string) => (tabSections[to] ?? [to]).some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <nav className={s.tabBar} aria-label="Navegação principal">
      {mobileTabs
        .filter((tab) => !tab.permission || can(tab.permission))
        .map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={s.tab} aria-current={isActive(to) ? 'page' : undefined}>
            <span className={s.tabPill}>
              <Icon aria-hidden />
              {to === '/inbox' && unread > 0 && (
                <span className={s.tabBadge} aria-label={`${unread} conversas não lidas`}>
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </span>
            {label}
          </Link>
        ))}
    </nav>
  );
}

function AccountMenu({ me }: { me: User }) {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const setStatus = useChangeAvailability(me);
  const statusLine = me.availability === 'paused' && me.pauseReason ? `Em pausa — ${me.pauseReason}` : availabilityLabels[me.availability].label;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={s.userButton} aria-label={`Conta de ${me.name}, ${statusLine}`}>
          <Avatar name={me.name} size={36} presence={me.availability} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={s.menu} side="right" align="end" sideOffset={10}>
          <div className={s.menuHeader}>
            <strong>{me.name}</strong>
            <span>{me.email}</span>
          </div>
          <DropdownMenu.Separator className={s.menuSeparator} />
          <DropdownMenu.Label className={s.menuLabel}>Status</DropdownMenu.Label>

          <StatusItem current={me.availability === 'available'} presence="available" onSelect={() => setStatus('available')} />
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={s.menuItem}>
              <span className={cx(s.statusDot, s['dot-paused'])} aria-hidden />
              <span className={s.statusText}>
                Em pausa
                <small>{me.availability === 'paused' && me.pauseReason ? me.pauseReason : 'Escolha o motivo'}</small>
              </span>
              {me.availability === 'paused' && <Check className={s.menuCheck} aria-hidden />}
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent className={s.menu} sideOffset={6}>
                {pauseReasons.map((reason) => (
                  <DropdownMenu.Item key={reason} className={s.menuItem} onSelect={() => setStatus('paused', reason)}>
                    {reason}
                    {me.availability === 'paused' && me.pauseReason === reason && <Check className={s.menuCheck} aria-hidden />}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
          <StatusItem current={me.availability === 'offline'} presence="offline" onSelect={() => setStatus('offline')} />

          <DropdownMenu.Separator className={s.menuSeparator} />
          <DropdownMenu.Item
            className={s.menuItem}
            onSelect={() => {
              signOut();
              navigate('/login', { replace: true });
            }}
          >
            <LogOut aria-hidden />
            Sair
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function StatusItem({ current, presence, onSelect }: { current: boolean; presence: Availability; onSelect: () => void }) {
  return (
    <DropdownMenu.Item className={s.menuItem} onSelect={onSelect}>
      <span className={cx(s.statusDot, s[`dot-${presence}`])} aria-hidden />
      <span className={s.statusText}>
        {availabilityLabels[presence].label}
        <small>{availabilityLabels[presence].description}</small>
      </span>
      {current && <Check className={s.menuCheck} aria-hidden />}
    </DropdownMenu.Item>
  );
}
