import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import type { Permission } from '../domain/types';
import { PlaceholderPage } from '../features/placeholder/PlaceholderPage';
import { RequirePermission } from './RequirePermission';
import { RequireSession } from './session';

// Carrega a tela sob demanda e, se indicado, só a mostra para quem tem a permissão.
function page<M>(load: () => Promise<M>, pick: (m: M) => ComponentType, permission?: Permission) {
  return async () => {
    const Component = pick(await load());
    return {
      element: permission ? (
        <RequirePermission permission={permission}>
          <Component />
        </RequirePermission>
      ) : (
        <Component />
      ),
    };
  };
}

// Cada tela é carregada sob demanda: o login não baixa o código do Inbox, e assim por diante.
export const router = createBrowserRouter([
  { path: '/login', lazy: page(() => import('../features/auth/LoginPage'), (m) => m.LoginPage) },
  { path: '/convite/:token', lazy: page(() => import('../features/auth/AcceptInvitePage'), (m) => m.AcceptInvitePage) },
  {
    path: '/',
    element: (
      <RequireSession>
        <AppShell />
      </RequireSession>
    ),
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      { path: 'inbox', lazy: page(() => import('../features/inbox/InboxPage'), (m) => m.InboxPage) },
      { path: 'tickets', lazy: page(() => import('../features/tickets/TicketsPage'), (m) => m.TicketsPage, 'tickets.view') },
      { path: 'tickets/:ticketId', lazy: page(() => import('../features/tickets/TicketDetailPage'), (m) => m.TicketDetailPage, 'tickets.view') },
      { path: 'contatos', lazy: page(() => import('../features/contacts/ContactsPage'), (m) => m.ContactsPage, 'contacts.view') },
      { path: 'painel', element: <PlaceholderPage title="Painel" description="Indicadores da operação em tempo real." /> },
      { path: 'filas', element: <Navigate to="/configuracoes/filas" replace /> },
      { path: 'workflows', element: <PlaceholderPage title="Workflows" description="Automações visuais com versão, publicação e rollback." /> },
      {
        path: 'configuracoes',
        lazy: page(() => import('../features/settings/SettingsLayout'), (m) => m.SettingsLayout),
        children: [
          { index: true, lazy: page(() => import('../features/settings/SettingsLayout'), (m) => m.SettingsHome) },
          { path: 'filas', lazy: page(() => import('../features/settings/QueuesSettings'), (m) => m.QueuesSettings, 'settings.queues') },
          {
            path: 'respostas-rapidas',
            lazy: page(() => import('../features/settings/QuickRepliesSettings'), (m) => m.QuickRepliesSettings, 'settings.quick_replies'),
          },
          { path: 'usuarios', lazy: page(() => import('../features/settings/UsersSettings'), (m) => m.UsersSettings, 'settings.users') },
          {
            path: 'canais',
            lazy: () =>
              import('../features/settings/SoonSection').then((m) => ({
                element: <m.SoonSection title="Canais" description="Números de WhatsApp conectados pela Cloud API e, depois, webchat e voz." />,
              })),
          },
        ],
      },
      { path: '*', element: <PlaceholderPage title="Página não encontrada" description="Verifique o endereço acessado." /> },
    ],
  },
]);
