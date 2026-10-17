import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from '../../design-system/components';
import { ticketPriority, ticketStatus } from '../../domain/labels';
import { formatDateTime } from '../../lib/format';
import s from '../features.module.css';

export function TicketsPage() {
  const tickets = useQuery(api.tickets);
  const contacts = useQuery(api.contacts);
  const users = useQuery(api.users);
  const contactName = useMemo(() => new Map(contacts.data?.map((c) => [c.id, c.name])), [contacts.data]);
  const userName = useMemo(() => new Map(users.data?.map((u) => [u.id, u.name])), [users.data]);

  return (
    <>
      <PageHeader
        title="Tickets"
        description="Todo ticket tem um protocolo único e imutável."
        actions={<Button variant="primary" icon={<Plus />}>Novo ticket</Button>}
      />
      {tickets.status === 'loading' && <LoadingState />}
      {tickets.status === 'error' && <ErrorState error={tickets.error} />}
      {tickets.status === 'success' &&
        (tickets.data.length === 0 ? (
          <EmptyState title="Nenhum ticket aberto" />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <th>Protocolo</th>
                <th>Assunto</th>
                <th>Contato</th>
                <th>Responsável</th>
                <th>Prioridade</th>
                <th>Status</th>
                <th>Aberto em</th>
              </tr>
            </thead>
            <tbody>
              {tickets.data.map((ticket) => (
                <tr key={ticket.id}>
                  <td className={s.mono}>{ticket.protocol}</td>
                  <td>{ticket.subject}</td>
                  <td>{contactName.get(ticket.contactId)}</td>
                  <td>{ticket.assigneeId ? userName.get(ticket.assigneeId) : '—'}</td>
                  <td>
                    <Badge tone={ticketPriority[ticket.priority].tone}>{ticketPriority[ticket.priority].label}</Badge>
                  </td>
                  <td>
                    <Badge tone={ticketStatus[ticket.status].tone}>{ticketStatus[ticket.status].label}</Badge>
                  </td>
                  <td>{formatDateTime(ticket.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ))}
    </>
  );
}
