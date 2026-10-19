import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { PlaceholderPage } from '../features/placeholder/PlaceholderPage';
import { RequireSession } from './session';

// Cada tela é carregada sob demanda: o login não baixa o código do Inbox, e assim por diante.
export const router = createBrowserRouter([
  { path: '/login', lazy: () => import('../features/auth/LoginPage').then((m) => ({ Component: m.LoginPage })) },
  {
    path: '/',
    element: (
      <RequireSession>
        <AppShell />
      </RequireSession>
    ),
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      { path: 'inbox', lazy: () => import('../features/inbox/InboxPage').then((m) => ({ Component: m.InboxPage })) },
      { path: 'tickets', lazy: () => import('../features/tickets/TicketsPage').then((m) => ({ Component: m.TicketsPage })) },
      { path: 'tickets/:ticketId', lazy: () => import('../features/tickets/TicketDetailPage').then((m) => ({ Component: m.TicketDetailPage })) },
      { path: 'contatos', lazy: () => import('../features/contacts/ContactsPage').then((m) => ({ Component: m.ContactsPage })) },
      { path: 'painel', element: <PlaceholderPage title="Painel" description="Indicadores da operação em tempo real." /> },
      { path: 'filas', element: <Navigate to="/configuracoes/filas" replace /> },
      { path: 'workflows', element: <PlaceholderPage title="Workflows" description="Automações visuais com versão, publicação e rollback." /> },
      {
        path: 'configuracoes',
        lazy: () => import('../features/settings/SettingsLayout').then((m) => ({ Component: m.SettingsLayout })),
        children: [
          { index: true, element: <Navigate to="filas" replace /> },
          { path: 'filas', lazy: () => import('../features/settings/QueuesSettings').then((m) => ({ Component: m.QueuesSettings })) },
          {
            path: 'respostas-rapidas',
            lazy: () => import('../features/settings/QuickRepliesSettings').then((m) => ({ Component: m.QuickRepliesSettings })),
          },
          {
            path: 'usuarios',
            lazy: () =>
              import('../features/settings/SoonSection').then((m) => ({
                element: <m.SoonSection title="Usuários e papéis" description="Convites, papéis e permissões de acesso da equipe." />,
              })),
          },
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
