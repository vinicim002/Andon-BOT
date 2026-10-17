import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import {
  LayoutDashboard,
  MessagesSquare,
  Moon,
  Settings,
  Sun,
  Ticket,
  Users,
  Workflow,
  ListOrdered,
} from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Avatar, Button } from '../../design-system/components';
import s from './AppShell.module.css';

const navigation = [
  { to: '/painel', label: 'Painel', icon: LayoutDashboard },
  { to: '/inbox', label: 'Inbox', icon: MessagesSquare },
  { to: '/tickets', label: 'Tickets', icon: Ticket },
  { to: '/contatos', label: 'Contatos', icon: Users },
  { to: '/filas', label: 'Filas', icon: ListOrdered },
  { to: '/workflows', label: 'Workflows', icon: Workflow },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

type Theme = 'light' | 'dark';

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('andon-theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {
      // Armazenamento indisponível: segue a preferência do sistema.
    }
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('andon-theme', theme);
    } catch {
      // Preferência só não persiste.
    }
  }, [theme]);

  return [theme, () => setTheme(theme === 'dark' ? 'light' : 'dark')] as const;
}

export function AppShell() {
  const [theme, toggleTheme] = useTheme();
  const currentUser = useQuery(api.currentUser).data;

  return (
    <div className={s.shell}>
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <img src="/logo-andon.png" alt="Andon" />
        </div>
        <nav aria-label="Navegação principal">
          <ul className={s.nav}>
            {navigation.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={({ isActive }) => (isActive ? `${s.navLink} ${s.active}` : s.navLink)}>
                  <Icon aria-hidden />
                  <span>{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <header className={s.topbar}>
        <span className={s.tenant}>Empresa Exemplo</span>
        <div className={s.topbarActions}>
          <Button
            variant="ghost"
            iconOnlyLabel={theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
            icon={theme === 'dark' ? <Sun /> : <Moon />}
            onClick={toggleTheme}
          />
          {currentUser && (
            <div className={s.user}>
              <Avatar name={currentUser.name} size={30} online={currentUser.online} />
              <span>{currentUser.name}</span>
            </div>
          )}
        </div>
      </header>

      <main className={s.content}>
        <Outlet />
      </main>
    </div>
  );
}
