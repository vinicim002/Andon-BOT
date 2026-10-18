import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2, Copy, Flag, Lock, MessageSquareText, MessagesSquare, Plus, RotateCcw, UserRound, ArrowRightLeft } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useSession } from '../../app/useSession';
import { Avatar, Badge, Button, ErrorState, LoadingState, Page } from '../../design-system/components';
import { Field, Select, TextArea } from '../../design-system/forms';
import { Timeline, type TimelineItem } from '../../design-system/Timeline';
import { useToast } from '../../design-system/useToast';
import { ticketPriority, ticketStatus } from '../../domain/labels';
import type { Contact, Id, Ticket, TicketEvent, TicketPriority, TicketStatus, User } from '../../domain/types';
import { formatDateTime } from '../../lib/format';
import s from './Tickets.module.css';

export function TicketDetailPage() {
  const { ticketId = '' } = useParams();
  const { user } = useSession();
  const ticket = useQuery(() => api.ticket(ticketId), ticketId);
  const events = useQuery(() => api.ticketEvents(ticketId), ticketId);
  const reference = useQuery(() => Promise.all([api.users(), api.contacts()]));

  if (ticket.status === 'error') return <Page><BackLink /><ErrorState error={ticket.error} /></Page>;
  if (ticket.status === 'loading' || events.status !== 'success' || reference.status !== 'success') return <LoadingState />;

  const [users, contacts] = reference.data;
  const me = users.find((u) => u.id === user?.id) ?? users[0];
  return (
    <TicketDetail
      ticket={ticket.data}
      events={events.data}
      users={users}
      contact={contacts.find((c) => c.id === ticket.data.contactId)}
      me={me}
    />
  );
}

function BackLink() {
  return (
    <Link to="/tickets" className={s.back}>
      <ArrowLeft aria-hidden /> Tickets
    </Link>
  );
}

type DetailProps = { ticket: Ticket; events: TicketEvent[]; users: User[]; contact?: Contact; me: User };

function TicketDetail({ ticket, events, users, contact, me }: DetailProps) {
  const toast = useToast();
  const userName = (id?: Id) => users.find((u) => u.id === id)?.name;
  const resolved = ticket.status === 'resolved' || ticket.status === 'closed';

  const update = async (patch: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: Id }, message: string) => {
    try {
      await api.updateTicket(ticket.id, patch, me.id);
      toast({ message });
    } catch {
      toast({ message: 'Não foi possível atualizar o ticket.', tone: 'error' });
    }
  };

  const copyProtocol = async () => {
    try {
      await navigator.clipboard.writeText(ticket.protocol);
      toast({ message: 'Protocolo copiado.' });
    } catch {
      toast({ message: 'O navegador bloqueou a cópia.', tone: 'error' });
    }
  };

  return (
    <Page>
      <BackLink />

      <header className={s.detailHeader}>
        <div className={s.detailTitle}>
          <div className={s.protocolRow}>
            <span className={s.protocolBig}>#{ticket.protocol}</span>
            <Button variant="ghost" iconOnlyLabel="Copiar protocolo" icon={<Copy />} onClick={copyProtocol} />
            <Badge tone={ticketStatus[ticket.status].tone}>{ticketStatus[ticket.status].label}</Badge>
            <Badge tone={ticketPriority[ticket.priority].tone}>Prioridade {ticketPriority[ticket.priority].label.toLowerCase()}</Badge>
          </div>
          <h1>{ticket.subject}</h1>
          <p className={s.muted}>
            Aberto em {formatDateTime(ticket.createdAt)} · atualizado em {formatDateTime(ticket.updatedAt)}
          </p>
        </div>
        <div className={s.detailActions}>
          {ticket.conversationId && (
            <Link to={`/inbox?c=${ticket.conversationId}`} className={s.linkButton}>
              <MessagesSquare aria-hidden /> Abrir conversa
            </Link>
          )}
          {resolved ? (
            <Button icon={<RotateCcw />} onClick={() => update({ status: 'in_progress' }, 'Ticket reaberto.')}>
              Reabrir
            </Button>
          ) : (
            <Button variant="primary" icon={<CheckCircle2 />} onClick={() => update({ status: 'resolved' }, 'Ticket resolvido.')}>
              Resolver ticket
            </Button>
          )}
        </div>
      </header>

      <div className={s.detailGrid}>
        <section className={s.mainColumn}>
          {ticket.description && (
            <div className={s.panel}>
              <h2 className={s.panelTitle}>Descrição</h2>
              <p className={s.description}>{ticket.description}</p>
            </div>
          )}

          <div className={s.panel}>
            <h2 className={s.panelTitle}>Histórico e auditoria</h2>
            <Timeline items={events.map((e) => toTimelineItem(e, userName))} formatAt={formatDateTime} />
            <CommentBox ticketId={ticket.id} me={me} />
          </div>
        </section>

        <aside className={s.sideColumn}>
          <div className={s.panel}>
            <h2 className={s.panelTitle}>Detalhes</h2>
            <div className={s.properties}>
              <Field label="Status">
                {(id) => (
                  <Select id={id} value={ticket.status} onChange={(e) => update({ status: e.target.value as TicketStatus }, 'Status atualizado.')}>
                    {Object.entries(ticketStatus).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Prioridade">
                {(id) => (
                  <Select id={id} value={ticket.priority} onChange={(e) => update({ priority: e.target.value as TicketPriority }, 'Prioridade atualizada.')}>
                    {Object.entries(ticketPriority).map(([value, { label }]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Responsável">
                {(id) => (
                  <Select
                    id={id}
                    value={ticket.assigneeId ?? ''}
                    onChange={(e) => update({ assigneeId: e.target.value || undefined }, 'Responsável atualizado.')}
                  >
                    <option value="">Sem responsável</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </div>

          {contact && (
            <div className={s.panel}>
              <h2 className={s.panelTitle}>Contato</h2>
              <div className={s.contactCard}>
                <Avatar name={contact.name} size={40} />
                <div>
                  <strong>{contact.name}</strong>
                  <span>{contact.phone}</span>
                  {contact.organization && <span>{contact.organization}</span>}
                </div>
              </div>
            </div>
          )}

          <p className={s.immutableNote}>
            <Lock aria-hidden /> O protocolo é imutável. Mudanças de status, prioridade e responsável ficam registradas no histórico.
          </p>
        </aside>
      </div>
    </Page>
  );
}

const statusLabel = (value?: string) => (value ? ticketStatus[value as TicketStatus]?.label : '');
const priorityLabel = (value?: string) => (value ? ticketPriority[value as TicketPriority]?.label : '');

function toTimelineItem(e: TicketEvent, userName: (id?: Id) => string | undefined): TimelineItem {
  const actor = <strong>{userName(e.actorUserId) ?? 'Sistema'}</strong>;
  const base = { id: e.id, at: e.createdAt };
  switch (e.type) {
    case 'created':
      return { ...base, icon: <Plus />, title: <>{actor} abriu o ticket</> };
    case 'status_changed':
      return {
        ...base,
        icon: <CheckCircle2 />,
        title: <>{actor} mudou o status de <strong>{statusLabel(e.from)}</strong> para <strong>{statusLabel(e.to)}</strong></>,
      };
    case 'priority_changed':
      return {
        ...base,
        icon: <Flag />,
        title: <>{actor} mudou a prioridade de <strong>{priorityLabel(e.from)}</strong> para <strong>{priorityLabel(e.to)}</strong></>,
      };
    case 'assigned':
      return e.to
        ? { ...base, icon: <UserRound />, title: <>{actor} atribuiu a <strong>{userName(e.to)}</strong></> }
        : { ...base, icon: <ArrowRightLeft />, title: <>{actor} removeu o responsável</> };
    case 'comment':
      return { ...base, icon: <MessageSquareText />, title: <>{actor} comentou</>, body: e.body, variant: 'comment' };
  }
}

function CommentBox({ ticketId, me }: { ticketId: Id; me: User }) {
  const toast = useToast();
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await api.commentTicket(ticketId, body.trim(), me.id);
      setBody('');
      toast({ message: 'Comentário salvo.' });
    } catch {
      toast({ message: 'Não foi possível salvar o comentário.', tone: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={s.commentBox} onSubmit={submit}>
      <Avatar name={me.name} size={28} />
      <div className={s.commentInput}>
        <label htmlFor="ticket-comment" className="visually-hidden">
          Comentário interno
        </label>
        <TextArea
          id="ticket-comment"
          rows={2}
          placeholder="Comentário interno sobre o ticket — o cliente não vê."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className={s.commentActions}>
          <Button type="submit" variant="primary" disabled={!body.trim() || saving}>
            Comentar
          </Button>
        </div>
      </div>
    </form>
  );
}
