import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Badge, Button } from '../../design-system/components';
import { ticketPriority, ticketStatus, type Tone } from '../../domain/labels';
import type { Conversation, OperationalQueue, User } from '../../domain/types';
import s from './Inbox.module.css';

type Props = { conversation: Conversation; queues: OperationalQueue[]; users: User[] };

export function ContextPanel({ conversation, queues, users }: Props) {
  const tickets = useQuery(api.tickets);
  const ticket = tickets.data?.find((t) => t.id === conversation.ticketId);
  const { contact } = conversation;
  const assignee = users.find((u) => u.id === conversation.assigneeId);
  const queue = queues.find((q) => q.id === conversation.queueId);

  return (
    <aside className={s.context} aria-label="Contexto da conversa">
      <section className={s.contextSection}>
        <h2>Contato</h2>
        <dl className={s.fields}>
          <dt>Nome</dt>
          <dd>{contact.name}</dd>
          <dt>Telefone</dt>
          <dd>{contact.phone}</dd>
          {contact.email && (
            <>
              <dt>E-mail</dt>
              <dd>{contact.email}</dd>
            </>
          )}
          {contact.organization && (
            <>
              <dt>Organização</dt>
              <dd>{contact.organization}</dd>
            </>
          )}
        </dl>
        {contact.tags.length > 0 && (
          <div className={s.tagRow}>
            {contact.tags.map((tag) => (
              <Badge key={tag.id} tone={tag.color as Tone}>{tag.name}</Badge>
            ))}
          </div>
        )}
      </section>

      <section className={s.contextSection}>
        <h2>Atendimento</h2>
        <dl className={s.fields}>
          <dt>Fila</dt>
          <dd>{queue?.name ?? 'Sem fila'}</dd>
          <dt>Responsável</dt>
          <dd>{assignee?.name ?? 'Ninguém'}</dd>
          <dt>Bot</dt>
          <dd>{conversation.botPaused ? 'Pausado' : 'Ativo'}</dd>
        </dl>
      </section>

      <section className={s.contextSection}>
        <h2>Ticket</h2>
        {ticket ? (
          <dl className={s.fields}>
            <dt>Protocolo</dt>
            <dd className={s.protocol}>{ticket.protocol}</dd>
            <dt>Assunto</dt>
            <dd>{ticket.subject}</dd>
            <dt>Prioridade</dt>
            <dd>
              <Badge tone={ticketPriority[ticket.priority].tone}>{ticketPriority[ticket.priority].label}</Badge>
            </dd>
            <dt>Status</dt>
            <dd>
              <Badge tone={ticketStatus[ticket.status].tone}>{ticketStatus[ticket.status].label}</Badge>
            </dd>
          </dl>
        ) : (
          <>
            <p className={s.muted}>Nenhum ticket vinculado.</p>
            <Button>Abrir ticket</Button>
          </>
        )}
      </section>
    </aside>
  );
}
