import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useCurrentUser } from '../../app/permissions';
import type { Permission } from '../../domain/types';
import { Button, EmptyState, ErrorState, LoadingState } from '../../design-system/components';
import { useToast } from '../../design-system/useToast';
import type { Conversation, Id, OperationalQueue, QuickReply, Tag, Ticket, TransferTarget, User } from '../../domain/types';
import { NewTicketDialog } from '../tickets/NewTicketDialog';
import { ContextPanel } from './ContextPanel';
import { ConversationList } from './ConversationList';
import { ConversationView } from './ConversationView';
import { matchesFilter, matchesSearch, statusTabOf, type InboxFilter, type StatusTab } from './inboxFilters';
import { TransferDialog } from './TransferDialog';
import s from './Inbox.module.css';

export function InboxPage() {
  const { me: current, can } = useCurrentUser();
  const conversations = useQuery(api.conversations);
  const reference = useQuery(() => Promise.all([api.queues(), api.users(), api.tickets(), api.quickReplies()]));

  if (conversations.status === 'loading' || reference.status === 'loading' || !current) return <LoadingState />;
  if (conversations.status === 'error') return <ErrorState error={conversations.error} />;
  if (reference.status === 'error') return <ErrorState error={reference.error} />;

  const [queues, users, tickets, quickReplies] = reference.data;
  const me = users.find((u) => u.id === current.id) ?? current;
  // Sem "ver todos", a pessoa só enxerga os atendimentos dela e os das filas de que participa.
  const myQueues = new Set(queues.filter((q) => q.memberIds.includes(me.id)).map((q) => q.id));
  const allowed = can('conversations.view_all')
    ? conversations.data
    : conversations.data.filter((c) => c.assigneeId === me.id || (c.queueId !== undefined && myQueues.has(c.queueId)));
  return <Inbox conversations={allowed} queues={queues} users={users} tickets={tickets} quickReplies={quickReplies} me={me} can={can} />;
}

type InboxProps = {
  conversations: Conversation[];
  queues: OperationalQueue[];
  users: User[];
  tickets: Ticket[];
  quickReplies: QuickReply[];
  me: User;
  can: (permission: Permission) => boolean;
};

function Inbox({ conversations, queues, users, tickets, quickReplies, me, can }: InboxProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // A conversa aberta fica na URL (?c=), para links vindos de outras telas (ex.: ticket).
  const selectedId = params.get('c') ?? conversations.find((c) => statusTabOf(c) === 'open')?.id;
  const selected = conversations.find((c) => c.id === selectedId);

  const [filter, setFilter] = useState<InboxFilter>('all');
  const [tabChoice, setTab] = useState<StatusTab>('open');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<'transfer' | 'ticket' | null>(null);

  // Ao chegar por link, mostra a aba onde a conversa está.
  const tab = params.get('c') && selected ? statusTabOf(selected) : tabChoice;

  const protocolByConversation = useMemo(
    () => new Map(tickets.filter((t) => t.conversationId).map((t) => [t.conversationId as Id, t.protocol])),
    [tickets],
  );

  const filtered = useMemo(
    () =>
      conversations.filter(
        (c) => matchesFilter(c, filter, me.id) && matchesSearch(c, search, protocolByConversation.get(c.id)),
      ),
    [conversations, filter, search, me.id, protocolByConversation],
  );

  const counts = useMemo(() => {
    const result: Record<StatusTab, number> = { bot: 0, pending: 0, open: 0, resolved: 0 };
    for (const c of filtered) result[statusTabOf(c)]++;
    return result;
  }, [filtered]);

  const visible = filtered
    .filter((c) => statusTabOf(c) === tab)
    .sort((a, b) => b.lastMessage.at.localeCompare(a.lastMessage.at));

  const select = (id: Id) => setParams({ c: id });

  // Conversa aberta na tela conta como lida — inclusive a aberta por padrão ou por link.
  const unreadOpen = selected && selected.unreadCount > 0 ? selected.id : undefined;
  useEffect(() => {
    if (unreadOpen) void api.conversation.markRead(unreadOpen);
  }, [unreadOpen]);

  const changeTab = (next: StatusTab) => {
    setTab(next);
    if (params.get('c')) setParams({});
  };

  // Executa a ação e mostra o aviso; em erro, mostra a mensagem da API.
  const run = async (action: Promise<unknown>, success: string) => {
    try {
      await action;
      toast({ message: success });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível concluir.', tone: 'error' });
    }
  };

  const userName = (id: Id) => users.find((u) => u.id === id)?.name ?? '';

  return (
    <div className={s.inbox}>
      <ConversationList
        conversations={visible}
        counts={counts}
        tab={tab}
        onTabChange={changeTab}
        filter={filter}
        onFilterChange={setFilter}
        search={search}
        onSearchChange={setSearch}
        selectedId={selectedId}
        onSelect={select}
        queues={queues}
        users={users}
        notice={
          me.availability !== 'available' && (
            <div className={s.availabilityNotice} role="status">
              <span>
                <strong>{me.availability === 'paused' ? `Você está em pausa${me.pauseReason ? ` (${me.pauseReason})` : ''}` : 'Você está ausente'}</strong>
                Não recebe novos atendimentos pelo rodízio.
              </span>
              <Button variant="secondary" onClick={() => run(api.setAvailability(me.id, 'available'), 'Status: Disponível.')}>
                Ficar disponível
              </Button>
            </div>
          )
        }
      />
      {selected ? (
        <>
          <ConversationView
            key={selected.id}
            conversation={selected}
            queues={queues}
            users={users}
            me={me}
            quickReplies={quickReplies}
            onAssign={() => run(api.conversation.assign(selected.id, me.id), 'Atendimento assumido.')}
            canReply={can('conversations.reply')}
            onTransfer={can('conversations.transfer') ? () => setDialog('transfer') : undefined}
            onOpenTicket={can('tickets.manage') ? () => setDialog('ticket') : undefined}
            onToggleBot={() =>
              run(api.conversation.setBotPaused(selected.id, !selected.botPaused, me.id), selected.botPaused ? 'Bot retomado.' : 'Bot pausado.')
            }
            onResolve={() => run(api.conversation.resolve(selected.id, me.id), 'Atendimento resolvido.')}
            onReopen={() => run(api.conversation.reopen(selected.id, me.id), 'Atendimento reaberto.')}
            onSend={(body, internal) =>
              internal
                ? run(api.conversation.send(selected.id, body, true, me.id), 'Anotação salva. Só a equipe vê.')
                : api.conversation.send(selected.id, body, false, me.id).catch(() => toast({ message: 'Falha ao enviar a mensagem.', tone: 'error' }))
            }
          />
          <ContextPanel
            key={`ctx-${selected.id}`}
            conversation={selected}
            queues={queues}
            users={users}
            ticket={tickets.find((t) => t.id === selected.ticketId)}
            onTagsChange={(tags: Tag[], message: string) => run(api.conversation.setTags(selected.id, tags), message)}
            canEditContact={can('contacts.edit')}
            onOpenTicket={can('tickets.manage') ? () => setDialog('ticket') : undefined}
          />

          <TransferDialog
            open={dialog === 'transfer'}
            onOpenChange={(open) => setDialog(open ? 'transfer' : null)}
            conversation={selected}
            users={users}
            queues={queues}
            me={me}
            onConfirm={(target: TransferTarget, note) => {
              setDialog(null);
              const destination = target.kind === 'user' ? userName(target.userId) : `fila ${queues.find((q) => q.id === target.queueId)?.name}`;
              return run(api.conversation.transfer(selected.id, target, note, me.id), `Atendimento transferido para ${destination}.`);
            }}
          />
          <NewTicketDialog
            open={dialog === 'ticket'}
            onOpenChange={(open) => setDialog(open ? 'ticket' : null)}
            conversation={selected}
            users={users}
            me={me}
            onCreated={(ticket) => {
              setDialog(null);
              toast({ message: `Ticket #${ticket.protocol} aberto.`, action: { label: 'Ver ticket', onClick: () => navigate(`/tickets/${ticket.id}`) } });
            }}
          />
        </>
      ) : (
        <div className={s.noSelection}>
          <EmptyState title="Selecione um atendimento" description="Escolha uma conversa na lista para começar." />
        </div>
      )}
    </div>
  );
}
