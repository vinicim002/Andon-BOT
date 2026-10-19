import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Plus, Search } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useCurrentUser } from '../../app/permissions';
import { Avatar, Badge, Button, DataTable, EmptyState, ErrorState, LoadingState, Page, PageHeader } from '../../design-system/components';
import { TextInput } from '../../design-system/forms';
import { useToast } from '../../design-system/useToast';
import { ticketPriority, ticketStatus } from '../../domain/labels';
import type { TicketStatus } from '../../domain/types';
import { cx } from '../../lib/cx';
import { formatDateTime } from '../../lib/format';
import { NewTicketDialog } from './NewTicketDialog';
import s from './Tickets.module.css';

type StatusFilter = 'active' | TicketStatus | 'all';

const filters: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Em aberto' },
  { value: 'open', label: 'Abertos' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'waiting', label: 'Aguardando' },
  { value: 'resolved', label: 'Resolvidos' },
  { value: 'all', label: 'Todos' },
];

const isActive = (status: TicketStatus) => status !== 'resolved' && status !== 'closed';

export function TicketsPage() {
  const { me: current, can } = useCurrentUser();
  const toast = useToast();
  const navigate = useNavigate();
  const tickets = useQuery(api.tickets);
  const contacts = useQuery(api.contacts);
  const users = useQuery(api.users);
  const [filter, setFilter] = useState<StatusFilter>('active');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  const contactById = useMemo(() => new Map(contacts.data?.map((c) => [c.id, c])), [contacts.data]);
  const userById = useMemo(() => new Map(users.data?.map((u) => [u.id, u])), [users.data]);
  const me = current;

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (tickets.data ?? [])
      .filter((t) => (filter === 'all' ? true : filter === 'active' ? isActive(t.status) : t.status === filter))
      .filter(
        (t) =>
          !term ||
          t.protocol.includes(term.replace(/\D/g, '') || '§') ||
          t.subject.toLowerCase().includes(term) ||
          contactById.get(t.contactId)?.name.toLowerCase().includes(term),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [tickets.data, filter, search, contactById]);

  const count = (value: StatusFilter) =>
    (tickets.data ?? []).filter((t) => (value === 'all' ? true : value === 'active' ? isActive(t.status) : t.status === value)).length;

  return (
    <Page>
      <PageHeader
        title="Tickets"
        description="Todo ticket tem um protocolo único e imutável."
        actions={
          can('tickets.manage') && (
            <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)} disabled={!me}>
              Novo ticket
            </Button>
          )
        }
      />

      <div className={s.toolbar}>
        <div className={s.filters} role="group" aria-label="Filtrar por status">
          {filters.map((f) => (
            <button key={f.value} type="button" aria-pressed={filter === f.value} className={cx(s.filter, filter === f.value && s.filterActive)} onClick={() => setFilter(f.value)}>
              {f.label}
              <span className={s.filterCount}>{count(f.value)}</span>
            </button>
          ))}
        </div>
        <div className={s.search}>
          <Search aria-hidden />
          <TextInput type="search" placeholder="Protocolo, assunto ou contato" aria-label="Buscar tickets" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {tickets.status === 'loading' && <LoadingState />}
      {tickets.status === 'error' && <ErrorState error={tickets.error} />}
      {tickets.status === 'success' &&
        (visible.length === 0 ? (
          <EmptyState title="Nenhum ticket encontrado" description="Ajuste o filtro ou a busca." />
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
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ticket) => {
                const assignee = ticket.assigneeId ? userById.get(ticket.assigneeId) : undefined;
                return (
                  // A linha inteira abre o ticket; o link no assunto mantém a navegação por teclado.
                  <tr key={ticket.id} className={s.row} onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <td className={s.protocol}>#{ticket.protocol}</td>
                    <td className={s.subject}>
                      <Link to={`/tickets/${ticket.id}`} onClick={(e) => e.stopPropagation()}>
                        {ticket.subject}
                      </Link>
                    </td>
                    <td>{contactById.get(ticket.contactId)?.name}</td>
                    <td>
                      {assignee ? (
                        <span className={s.person}>
                          <Avatar name={assignee.name} size={22} />
                          {assignee.name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <Badge tone={ticketPriority[ticket.priority].tone}>{ticketPriority[ticket.priority].label}</Badge>
                    </td>
                    <td>
                      <Badge tone={ticketStatus[ticket.status].tone}>{ticketStatus[ticket.status].label}</Badge>
                    </td>
                    <td className={s.muted}>{formatDateTime(ticket.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ))}

      {me && users.data && (
        <NewTicketDialog
          open={creating}
          onOpenChange={setCreating}
          users={users.data}
          me={me}
          onCreated={(ticket) => {
            setCreating(false);
            toast({ message: `Ticket #${ticket.protocol} aberto.` });
            navigate(`/tickets/${ticket.id}`);
          }}
        />
      )}
    </Page>
  );
}
