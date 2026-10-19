import { NavLink, Outlet, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { Bell, Check, LayoutDashboard, LogOut, MessagesSquare, Moon, Settings, Sun, Ticket, Users, Workflow, type LucideIcon } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useSession } from '../../app/useSession';
import { useTheme } from '../../app/theme';
import { BrandSymbol } from '../../design-system/BrandSymbol';
import { Avatar, Tooltip, TooltipProvider } from '../../design-system/components';
import { useToast } from '../../design-system/useToast';
import { availability as availabilityLabels, pauseReasons } from '../../domain/labels';
import type { Availability, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import s from './AppShell.module.css';

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number };

// Grupos separados por divisória, como na referência: operação, cadastro, automação/gestão.
const navigation: NavItem[][] = [
  [{ to: '/inbox', label: 'Atendimentos', icon: MessagesSquare }],
  [
    { to: '/tickets', label: 'Tickets', icon: Ticket },
    { to: '/contatos', label: 'Contatos', icon: Users },
  ],
  [
    { to: '/workflows', label: 'Workflows', icon: Workflow },
    { to: '/painel', label: 'Painel', icon: LayoutDashboard },
  ],
];

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
  const { user: sessionUser } = useSession();
  // A disponibilidade muda durante o uso; por isso o usuário vem da API, não da sessão.
  const me = useQuery(api.users).data?.find((u) => u.id === sessionUser?.id);

  return (
    <TooltipProvider>
      <div className={s.shell}>
        <nav className={s.rail} aria-label="Navegação principal">
          <BrandSymbol className={s.brand} />

          <Tooltip content="Notificações">
            <button type="button" className={s.railButton} aria-label="Notificações (1 nova)">
              <Bell aria-hidden />
              <span className={s.railBadge}>1</span>
            </button>
          </Tooltip>

          {navigation.map((group, index) => (
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
            <RailLink item={{ to: '/configuracoes', label: 'Configurações', icon: Settings }} />
            {me && <AccountMenu me={me} />}
          </div>
        </nav>

        <main className={s.content}>
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}

function AccountMenu({ me }: { me: User }) {
  const { signOut } = useSession();
  const navigate = useNavigate();
  const toast = useToast();

  const setStatus = async (next: Availability, reason?: string) => {
    try {
      const received = await api.setAvailability(me.id, next, reason);
      const label = next === 'paused' ? `Em pausa${reason ? ` — ${reason}` : ''}` : availabilityLabels[next].label;
      toast({ message: received ? `${label}. Você recebeu ${received} atendimento(s) da fila.` : `Status: ${label}.` });
    } catch {
      toast({ message: 'Não foi possível mudar o status.', tone: 'error' });
    }
  };

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
