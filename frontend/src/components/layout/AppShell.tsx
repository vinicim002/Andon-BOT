import { NavLink, Outlet, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import {
  Bell,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  MessagesSquare,
  Moon,
  Settings,
  Sun,
  Ticket,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { useSession } from '../../app/useSession';
import { useTheme } from '../../app/theme';
import { BrandSymbol } from '../../design-system/BrandSymbol';
import { Avatar, Tooltip, TooltipProvider } from '../../design-system/components';
import s from './AppShell.module.css';

type NavItem = { to: string; label: string; icon: LucideIcon; badge?: number };

// Grupos separados por divisória, como na referência: operação, cadastro, automação/gestão.
const navigation: NavItem[][] = [
  [{ to: '/inbox', label: 'Atendimentos', icon: MessagesSquare }],
  [
    { to: '/tickets', label: 'Tickets', icon: Ticket },
    { to: '/contatos', label: 'Contatos', icon: Users },
    { to: '/filas', label: 'Filas', icon: ListOrdered },
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
  const { user, signOut } = useSession();
  const navigate = useNavigate();

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

            {user && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button type="button" className={s.userButton} aria-label={`Conta de ${user.name}`}>
                    <Avatar name={user.name} size={36} online={user.online} />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className={s.menu} side="right" align="end" sideOffset={10}>
                    <div className={s.menuHeader}>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
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
            )}
          </div>
        </nav>

        <main className={s.content}>
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  );
}
