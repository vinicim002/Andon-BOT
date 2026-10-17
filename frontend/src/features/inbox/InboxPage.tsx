import { useMemo, useState } from 'react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { EmptyState, ErrorState, LoadingState } from '../../design-system/components';
import type { Conversation, Id, Message, OperationalQueue, User } from '../../domain/types';
import { ConversationList, type InboxFilter } from './ConversationList';
import { ConversationView } from './ConversationView';
import { ContextPanel } from './ContextPanel';
import s from './Inbox.module.css';

// Ações aqui só alteram o estado local: o objetivo é descobrir o fluxo do atendente antes de
// definir os endpoints. Cada ação corresponde a um futuro comando na API + evento de conversa.
export function InboxPage() {
  const loaded = useQuery(() => Promise.all([api.conversations(), api.queues(), api.users(), api.currentUser()]));

  if (loaded.status === 'loading') return <LoadingState />;
  if (loaded.status === 'error') return <ErrorState error={loaded.error} />;

  const [conversations, queues, users, me] = loaded.data;
  return <Inbox initial={conversations} queues={queues} users={users} me={me} />;
}

type InboxProps = { initial: Conversation[]; queues: OperationalQueue[]; users: User[]; me: User };

function Inbox({ initial, queues, users, me }: InboxProps) {
  const [selectedId, setSelectedId] = useState<Id | undefined>(initial[0]?.id);
  // Abrir a conversa marca as mensagens como lidas (inclusive a aberta por padrão).
  const [conversations, setConversations] = useState(() =>
    initial.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)),
  );
  const [filter, setFilter] = useState<InboxFilter>('mine');
  const [sentMessages, setSentMessages] = useState<Message[]>([]);

  const selected = conversations.find((c) => c.id === selectedId);

  const visible = useMemo(() => {
    const byFilter = conversations.filter((c) => {
      if (filter === 'mine') return c.assigneeId === me.id;
      if (filter === 'unassigned') return !c.assigneeId;
      return true;
    });
    return byFilter.sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
  }, [conversations, filter, me.id]);

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
        body,
        deliveryStatus: internal ? undefined : 'pending',
        createdAt: now,
      },
    ]);
    if (!internal) update(selected.id, { lastMessagePreview: `Você: ${body}`, lastMessageAt: now });
  };

  return (
    <div className={s.inbox}>
      <ConversationList
        conversations={visible}
        filter={filter}
        onFilterChange={setFilter}
        selectedId={selectedId}
        onSelect={select}
        queues={queues}
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
            onSend={send}
          />
          <ContextPanel conversation={selected} queues={queues} users={users} />
        </>
      ) : (
        <div className={s.noSelection}>
          <EmptyState title="Selecione uma conversa" />
        </div>
      )}
    </div>
  );
}
