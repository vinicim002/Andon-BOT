import { Avatar, Badge, EmptyState } from '../../design-system/components';
import { conversationStatus } from '../../domain/labels';
import type { Conversation, Id, OperationalQueue } from '../../domain/types';
import { formatRelative } from '../../lib/format';
import s from './Inbox.module.css';

export type InboxFilter = 'mine' | 'unassigned' | 'all';

const filters: { value: InboxFilter; label: string }[] = [
  { value: 'mine', label: 'Minhas' },
  { value: 'unassigned', label: 'Sem responsável' },
  { value: 'all', label: 'Todas' },
];

type Props = {
  conversations: Conversation[];
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  selectedId?: Id;
  onSelect: (id: Id) => void;
  queues: OperationalQueue[];
};

export function ConversationList({ conversations, filter, onFilterChange, selectedId, onSelect, queues }: Props) {
  const queueName = (id?: Id) => queues.find((q) => q.id === id)?.name;

  return (
    <section className={s.list} aria-label="Conversas">
      <div className={s.filters} role="tablist">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            className={filter === f.value ? `${s.filter} ${s.filterActive}` : s.filter}
            onClick={() => onFilterChange(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Nenhuma conversa neste filtro." />
      ) : (
        <ul className={s.items}>
          {conversations.map((c) => {
            const status = conversationStatus[c.status];
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={c.id === selectedId ? `${s.item} ${s.itemSelected}` : s.item}
                  onClick={() => onSelect(c.id)}
                  aria-current={c.id === selectedId}
                >
                  <Avatar name={c.contact.name} size={36} />
                  <span className={s.itemBody}>
                    <span className={s.itemTop}>
                      <span className={s.itemName}>{c.contact.name}</span>
                      <span className={s.itemTime}>{formatRelative(c.lastMessageAt)}</span>
                    </span>
                    <span className={s.itemPreview}>{c.lastMessagePreview}</span>
                    <span className={s.itemMeta}>
                      <Badge tone={status.tone}>{status.label}</Badge>
                      {queueName(c.queueId) && <span className={s.itemQueue}>{queueName(c.queueId)}</span>}
                      {c.unreadCount > 0 && (
                        <span className={s.unread} aria-label={`${c.unreadCount} não lidas`}>
                          {c.unreadCount}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
