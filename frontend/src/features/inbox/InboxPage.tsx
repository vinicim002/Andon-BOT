import { useMemo, useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useSession } from '../../app/useSession';
import { EmptyState, ErrorState, LoadingState } from '../../design-system/components';
import type { Conversation, Id, Message, OperationalQueue, Tag, User } from '../../domain/types';
import { ContextPanel } from './ContextPanel';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { matchesFilter, statusTabOf, type InboxFilter, type StatusTab } from './inboxFilters';
import s from './Inbox.module.css';

// Ações aqui só alteram o estado local: o objetivo é descobrir o fluxo do atendente antes de
// definir os endpoints. Cada ação corresponde a um futuro comando na API + evento de conversa.
export function InboxPage() {
  const { user } = useSession();
  const loaded = useQuery(() => Promise.all([api.conversations(), api.queues(), api.users()]));

  if (loaded.status === 'loading') return <LoadingState />;
  if (loaded.status === 'error') return <ErrorState error={loaded.error} />;

  const [conversations, queues, users] = loaded.data;
  const me = users.find((u) => u.id === user?.id) ?? users[0];
  return <Inbox initial={conversations} queues={queues} users={users} me={me} />;
}

type InboxProps = { initial: Conversation[]; queues: OperationalQueue[]; users: User[]; me: User };

function Inbox({ initial, queues, users, me }: InboxProps) {
  const [selectedId, setSelectedId] = useState<Id | undefined>(initial.find((c) => statusTabOf(c) === 'open')?.id);
  // Abrir a conversa marca as mensagens como lidas (inclusive a aberta por padrão).
  const [conversations, setConversations] = useState(() =>
    initial.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)),
  );
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [tab, setTab] = useState<StatusTab>('open');
  const [search, setSearch] = useState('');
  const [sentMessages, setSentMessages] = useState<Message[]>([]);

  const selected = conversations.find((c) => c.id === selectedId);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter(
      (c) =>
        matchesFilter(c, filter, me.id) &&
        (!term || c.contact.name.toLowerCase().includes(term) || c.contact.organization?.toLowerCase().includes(term)),
    );
  }, [conversations, filter, search, me.id]);

  const counts = useMemo(() => {
    const result: Record<StatusTab, number> = { bot: 0, pending: 0, open: 0, resolved: 0 };
    for (const c of filtered) result[statusTabOf(c)]++;
    return result;
  }, [filtered]);

  const visible = filtered
    .filter((c) => statusTabOf(c) === tab)
    .sort((a, b) => b.lastMessage.at.localeCompare(a.lastMessage.at));

  const update = (id: Id, patch: Partial<Conversation>) =>
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const select = (id: Id) => {
    setSelectedId(id);
    update(id, { unreadCount: 0 });
  };

  const send = (body: string, internal: boolean) => {
    if (!selected) return;
    const now = new Date().toISOString();
    setSentMessages((list) => [
      ...list,
      {
        id: crypto.randomUUID(),
        conversationId: selected.id,
        direction: internal ? 'internal' : 'outbound',
        senderType: 'user',
        senderUserId: me.id,
        contentType: 'text',
        body,
        deliveryStatus: internal ? undefined : 'sent',
        createdAt: now,
      },
    ]);
    if (!internal) {
      update(selected.id, {
        lastMessage: { preview: body, contentType: 'text', direction: 'outbound', deliveryStatus: 'sent', at: now },
      });
    }
  };

  const setTags = (tags: Tag[]) => selected && update(selected.id, { tags });

  return (
    <div className={s.inbox}>
      <ConversationList
        conversations={visible}
        counts={counts}
        tab={tab}
        onTabChange={setTab}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        selectedId={selectedId}
        onSelect={select}
        queues={queues}
        users={users}
      />
      {selected ? (
        <>
          <ConversationView
            key={selected.id}
            conversation={selected}
            extraMessages={sentMessages.filter((m) => m.conversationId === selected.id)}
            queues={queues}
            users={users}
            me={me}
            onAssign={() => update(selected.id, { assigneeId: me.id, status: 'in_progress', botPaused: true })}
            onTransfer={(queueId) => update(selected.id, { queueId, assigneeId: undefined, status: 'queued' })}
            onToggleBot={() => update(selected.id, { botPaused: !selected.botPaused })}
            onResolve={() => update(selected.id, { status: 'resolved' })}
            onReopen={() => update(selected.id, { status: 'in_progress', assigneeId: me.id })}
            onSend={send}
          />
          <ContextPanel key={`ctx-${selected.id}`} conversation={selected} queues={queues} users={users} onTagsChange={setTags} />
        </>
      ) : (
        <div className={s.noSelection}>
          <EmptyState title="Selecione um atendimento" description="Escolha uma conversa na lista para começar." />
        </div>
      )}
    </div>
  );
}
