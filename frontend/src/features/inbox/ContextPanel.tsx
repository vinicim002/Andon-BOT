import { useState, type ReactNode } from 'react';
import { DropdownMenu } from 'radix-ui';
import { Building2, ChevronDown, ChevronRight, Copy, Link2, Plus, Timer } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Avatar, Badge, Button, EmptyState, LoadingState, TagChip } from '../../design-system/components';
import { WhatsAppIcon } from '../../design-system/icons';
import { ticketStatus } from '../../domain/labels';
import type { Conversation, OperationalQueue, Tag, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import { formatCountdown, formatDate } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import s from './Inbox.module.css';

type Props = {
  conversation: Conversation;
  queues: OperationalQueue[];
  users: User[];
  onTagsChange: (tags: Tag[]) => void;
};

export function ContextPanel({ conversation, queues, users, onTagsChange }: Props) {
  const [tab, setTab] = useState<'about' | 'history'>('about');

  return (
    <aside className={s.context} aria-label="Detalhes do atendimento">
      <div className={s.contextTabs} role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'about'} className={cx(s.contextTab, tab === 'about' && s.contextTabActive)} onClick={() => setTab('about')}>
          Sobre
        </button>
        <button type="button" role="tab" aria-selected={tab === 'history'} className={cx(s.contextTab, tab === 'history' && s.contextTabActive)} onClick={() => setTab('history')}>
          Histórico
        </button>
      </div>

      {tab === 'about' ? (
        <About conversation={conversation} queues={queues} users={users} onTagsChange={onTagsChange} />
      ) : (
        <History contactId={conversation.contact.id} />
      )}
    </aside>
  );
}

function About({ conversation: c, queues, users, onTagsChange }: Props) {
  const { contact } = c;
  const now = useNow();
  const tickets = useQuery(api.tickets);
  const ticket = tickets.data?.find((t) => t.id === c.ticketId);
  const assignee = users.find((u) => u.id === c.assigneeId);
  const queue = queues.find((q) => q.id === c.queueId);
  const [copied, setCopied] = useState(false);
  const tagCatalog = useQuery(api.tags).data ?? [];

  // Resumo que o atendente cola em ferramentas de IA; com a IA governada, vira contexto automático.
  const copyAiContext = async () => {
    const summary = [
      `Contato: ${contact.name}${contact.organization ? ` (${contact.organization})` : ''}`,
      contact.jobTitle && `Cargo: ${contact.jobTitle}`,
      `Etiquetas: ${c.tags.map((t) => t.name).join(', ') || 'nenhuma'}`,
      `Última mensagem: ${c.lastMessage.preview}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sem permissão de área de transferência: nada a fazer na demonstração.
    }
  };

  const unusedTags = tagCatalog.filter((t) => !c.tags.some((used) => used.id === t.id));

  return (
    <div className={s.cards}>
      <Card title="Contato">
        <div className={s.contactHead}>
          <Avatar name={contact.name} size={64} />
          <div className={s.contactHeadText}>
            <strong>{contact.name}</strong>
            {(contact.jobTitle || contact.organization) && (
              <span>
                <Building2 aria-hidden />
                {[contact.jobTitle, contact.organization].filter(Boolean).join(' • ')}
              </span>
            )}
            <Button className={s.editContact}>Editar contato</Button>
          </div>
        </div>
        <dl className={s.fields}>
          <Field label="ID">#{contact.code}</Field>
          <Field label="WhatsApp">{contact.phone}</Field>
          <Field label="E-mail">{contact.email}</Field>
          <Field label="Cargo e Empresa">{[contact.jobTitle, contact.organization].filter(Boolean).join(' · ') || undefined}</Field>
          <Field label="CPF">{contact.cpf}</Field>
          <Field label="CNPJ">
            {contact.cnpj && (
              <>
                {contact.cnpj} <Link2 aria-label="Vinculado à organização" className={s.linkIcon} />
              </>
            )}
          </Field>
        </dl>
      </Card>

      <Card title="Etiquetas" count={c.tags.length} collapsible>
        <div className={s.tagEditor}>
          {c.tags.map((tag) => (
            <TagChip key={tag.id} color={tag.color} onRemove={() => onTagsChange(c.tags.filter((t) => t.id !== tag.id))}>
              {tag.name}
            </TagChip>
          ))}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button type="button" className={s.addTag} aria-label="Adicionar etiqueta" disabled={unusedTags.length === 0}>
                <Plus />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={s.menu} align="start" sideOffset={4}>
                {unusedTags.map((tag) => (
                  <DropdownMenu.Item key={tag.id} className={s.menuItem} onSelect={() => onTagsChange([...c.tags, tag])}>
                    <span className={cx(s.queueDot, s[`queue-${tag.color}`])} aria-hidden />
                    {tag.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </Card>

      <Card title="Atendimento" collapsible>
        <dl className={s.fields}>
          <Field label="Contexto para IA">
            <Button className={s.inlineButton} icon={<Copy />} onClick={copyAiContext}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </Field>
          <Field label="Protocolo">{ticket ? `#${ticket.protocol}` : 'Sem ticket'}</Field>
          <Field label="Janela de conversa">
            {c.windowExpiresAt && <Countdown target={c.windowExpiresAt} now={now} total={24 * 3600} />}
          </Field>
          <Field label="Resolução automática">
            {c.autoResolveAt && c.status !== 'resolved' && <Countdown target={c.autoResolveAt} now={now} total={6 * 3600} />}
          </Field>
        </dl>
      </Card>

      <button type="button" className={cx(s.card, s.cardLink)}>
        <span className={s.cardTitle}>
          <Timer aria-hidden /> SLA: Clientes
        </span>
        <ChevronRight aria-hidden />
      </button>

      <Card title="Relacionados" collapsible>
        <div className={s.related}>
          {assignee && (
            <span className={s.relatedChip}>
              <Avatar name={assignee.name} size={18} />
              {assignee.name}
            </span>
          )}
          {queue && (
            <span className={s.relatedChip}>
              <span className={cx(s.queueDot, s[`queue-${queue.color}`])} aria-hidden />
              {queue.name}
            </span>
          )}
          <span className={s.relatedChip}>
            <WhatsAppIcon className={s.relatedWhatsApp} />
            {c.endpoint.name}
          </span>
        </div>
      </Card>
    </div>
  );
}

function Countdown({ target, now, total }: { target: string; now: number; total: number }) {
  const remaining = Math.max(0, (new Date(target).getTime() - now) / 1000);
  const fraction = Math.min(1, remaining / total);
  const expired = remaining <= 0;
  return (
    <span className={cx(s.countdown, expired && s.countdownExpired)}>
      <span className={s.countdownRing} style={{ '--progress': `${fraction * 360}deg` } as React.CSSProperties} aria-hidden />
      {expired ? 'Encerrada' : `Restam ${formatCountdown(target, now)}`}
    </span>
  );
}

function History({ contactId }: { contactId: string }) {
  const tickets = useQuery(() => api.ticketsByContact(contactId), contactId);
  if (tickets.status === 'loading') return <LoadingState />;
  if (tickets.status === 'error' || tickets.data.length === 0) {
    return <EmptyState title="Sem histórico" description="Nenhum atendimento anterior com este contato." />;
  }
  return (
    <ul className={s.history}>
      {tickets.data.map((t) => (
        <li key={t.id} className={s.historyItem}>
          <span className={s.historyTop}>
            <span className={s.mono}>#{t.protocol}</span>
            <Badge tone={ticketStatus[t.status].tone}>{ticketStatus[t.status].label}</Badge>
          </span>
          <strong>{t.subject}</strong>
          <span className={s.historyDate}>{formatDate(t.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({ title, count, collapsible, children }: { title: string; count?: number; collapsible?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={s.card}>
      {collapsible ? (
        <button type="button" className={s.cardHeader} aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className={s.cardTitle}>{title}</span>
          {count !== undefined && <span className={s.cardCount}>{count}</span>}
          <ChevronDown aria-hidden className={cx(s.chevron, !open && s.chevronClosed)} />
        </button>
      ) : (
        <h2 className={s.cardHeader}>
          <span className={s.cardTitle}>{title}</span>
        </h2>
      )}
      {open && <div className={s.cardBody}>{children}</div>}
    </section>
  );
}

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <div className={s.field}>
      <dt>{label}</dt>
      <dd>{children || <span className={s.emptyValue}>—</span>}</dd>
    </div>
  );
}
