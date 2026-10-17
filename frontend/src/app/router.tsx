import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from '../components/layout/AppShell';
import { ContactsPage } from '../features/contacts/ContactsPage';
import { InboxPage } from '../features/inbox/InboxPage';
import { PlaceholderPage } from '../features/placeholder/PlaceholderPage';
import { TicketsPage } from '../features/tickets/TicketsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/inbox" replace /> },
      { path: 'inbox', element: <InboxPage /> },
      { path: 'tickets', element: <TicketsPage /> },
      { path: 'contatos', element: <ContactsPage /> },
      { path: 'painel', element: <PlaceholderPage title="Painel" description="Indicadores da operação em tempo real." /> },
      { path: 'filas', element: <PlaceholderPage title="Filas" description="Filas operacionais, membros e políticas de roteamento." /> },
      { path: 'workflows', element: <PlaceholderPage title="Workflows" description="Automações visuais com versão, publicação e rollback." /> },
      { path: 'configuracoes', element: <PlaceholderPage title="Configurações" description="Canais, usuários, papéis e plano da empresa." /> },
      { path: '*', element: <PlaceholderPage title="Página não encontrada" description="Verifique o endereço acessado." /> },
    ],
  },
]);
