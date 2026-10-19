import { NavLink, Outlet } from 'react-router';
import { ListOrdered, MessageSquareQuote, Smartphone, UserCog } from 'lucide-react';
import { cx } from '../../lib/cx';
import s from './Settings.module.css';

const sections = [
  {
    title: 'Atendimento',
    items: [
      { to: 'filas', label: 'Filas', icon: ListOrdered },
      { to: 'respostas-rapidas', label: 'Respostas rápidas', icon: MessageSquareQuote },
    ],
  },
  {
    title: 'Empresa',
    items: [
      { to: 'usuarios', label: 'Usuários e papéis', icon: UserCog, soon: true },
      { to: 'canais', label: 'Canais', icon: Smartphone, soon: true },
    ],
  },
];

export function SettingsLayout() {
  return (
    <div className={s.layout}>
      <nav className={s.nav} aria-label="Configurações">
        <h1 className={s.navTitle}>Configurações</h1>
        {sections.map((section) => (
          <div key={section.title} className={s.navSection}>
            <span className={s.navSectionTitle}>{section.title}</span>
            {section.items.map(({ to, label, icon: Icon, ...item }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cx(s.navLink, isActive && s.navLinkActive)}>
                <Icon aria-hidden />
                {label}
                {'soon' in item && <span className={s.soon}>em breve</span>}
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
