import { useState } from 'react';
import { Bot, Camera, Check, CheckCheck, CheckCircle2, Clock, Hourglass, MessageCircleMore, Plus, Search, SlidersHorizontal, Timer, X } from 'lucide-react';
import { Avatar, Button, EmptyState, TagChip, Tooltip } from '../../design-system/components';
import { WhatsAppIcon } from '../../design-system/icons';
import type { Conversation, Id, OperationalQueue, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import { formatListTime } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import type { InboxFilter, StatusTab } from './inboxFilters';
import s from './Inbox.module.css';

const filters: { value: InboxFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'mine', label: 'Meus' },
  { value: 'mentions', label: 'Menções' },
  { value: 'unanswered', label: 'Sem resposta' },
  { value: 'unread', label: 'Não lidos' },
];

const tabs: { value: StatusTab; label: string; icon: typeof Bot; tone: string }[] = [
  { value: 'bot', label: 'Automático', icon: Bot, tone: s.countBot },
  { value: 'pending', label: 'Pendentes', icon: Hourglass, tone: s.countPending },
  { value: 'open', label: 'Abertos', icon: MessageCircleMore, tone: s.countOpen },
  { value: 'resolved', label: 'Resolvidos', icon: CheckCircle2, tone: s.countResolved },
];

const formatCount = (n: number) => (n >= 1000 ? `${Math.floor(n / 1000)} mil` : String(n));

type Props = {
  conversations: Conversation[];
  counts: Record<StatusTab, number>;
  tab: StatusTab;
  onTabChange: (tab: StatusTab) => void;
  filter: InboxFilter;
  onFilterChange: (filter: InboxFilter) => void;
  search: string;
  onSearchChange: (term: string) => void;
  selectedId?: Id;
  onSelect: (id: Id) => void;
  queues: OperationalQueue[];
  users: User[];
};

export function ConversationList(props: Props) {
  const { conversations, counts, tab, filter, search, selectedId, queues, users } = props;
  const [searching, setSearching] = useState(false);
  const now = useNow(30_000);

  return (
    <section className={s.list} aria-label="Atendimentos">
      <header className={s.listHeader}>
        {searching ? (
          <div className={s.searchBox}>
            <Search aria-hidden />
            <input
              autoFocus
              value={search}
              onChange={(e) => props.onSearchChange(e.target.value)}
              placeholder="Buscar por nome ou empresa"
              aria-label="Buscar atendimentos"
            />
            <button
              type="button"
              aria-label="Fechar busca"
              onClick={() => {
                props.onSearchChange('');
                setSearching(false);
              }}
            >
              <X />
            </button>
          </div>
        ) : (
          <>
            <h1 className={s.listTitle}>Atendimentos</h1>
            <div className={s.listActions}>
              <Button variant="ghost" iconOnlyLabel="Filtros avançados" icon={<SlidersHorizontal />} />
              <Button variant="ghost" iconOnlyLabel="Buscar" icon={<Search />} onClick={() => setSearching(true)} />
              <Button variant="secondary" iconOnlyLabel="Novo atendimento" icon={<Plus />} />
            </div>
          </>
        )}
      </header>

      <div className={s.chips} role="group" aria-label="Filtros">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            className={cx(s.chip, filter === f.value && s.chipActive)}
            onClick={() => props.onFilterChange(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className={s.tabs} role="tablist" aria-label="Status">
        {tabs.map(({ value, label, icon: Icon, tone }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={cx(s.tab, tab === value && s.tabActive)}
            onClick={() => props.onTabChange(value)}
          >
            <span className={s.tabIcon}>
              <Icon aria-hidden />
              {counts[value] > 0 && <span className={cx(s.tabCount, tone)}>{formatCount(counts[value])}</span>}
            </span>
            {label}
          </button>
        ))}
      </div>

      {conversations.length === 0 ? (
        <EmptyState title="Nada por aqui" description="Nenhum atendimento neste filtro." />
      ) : (
        <ul className={s.items}>
          {conversations.map((c) => (
            <li key={c.id}>
              <ConversationItem
                conversation={c}
                selected={c.id === selectedId}
                onSelect={() => props.onSelect(c.id)}
                queue={queues.find((q) => q.id === c.queueId)}
                users={users}
                now={now}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type ItemProps = {
  conversation: Conversation;
  selected: boolean;
  onSelect: () => void;
  queue?: OperationalQueue;
  users: User[];
  now: number;
};

function ConversationItem({ conversation: c, selected, onSelect, queue, users, now }: ItemProps) {
  const team = [c.assigneeId, ...c.participantIds]
    .filter((id): id is string => Boolean(id))
    .map((id) => users.find((u) => u.id === id))
    .filter((u): u is User => Boolean(u));

  // SLA de primeira resposta: vencido vira alerta vermelho no lugar do horário.
  const slaOverdueMin =
    c.slaDueAt && c.lastMessage.direction === 'inbound' && c.status !== 'resolved'
      ? Math.floor((now - new Date(c.slaDueAt).getTime()) / 60_000)
      : undefined;

  return (
    <button
      type="button"
      className={cx(s.item, selected && s.itemSelected)}
      onClick={onSelect}
      aria-current={selected}
      style={{ '--queue-color': queue ? `var(--tag-${queue.color})` : 'transparent' } as React.CSSProperties}
    >
      <Avatar name={c.contact.name} size={46} badge={<WhatsAppIcon />} ring={c.unreadCount > 0} />

      <span className={s.itemBody}>
        <span className={s.itemTop}>
          <span className={s.itemName}>
            <strong>{c.contact.name}</strong>
            {c.contact.organization && <span> • {c.contact.organization}</span>}
          </span>
          {slaOverdueMin !== undefined && slaOverdueMin >= 0 ? (
            <Tooltip content="Prazo de primeira resposta vencido" side="top">
              <span className={s.slaOverdue}>
                <Timer aria-hidden />
                {Math.max(1, slaOverdueMin)} min
              </span>
            </Tooltip>
          ) : (
            <span className={cx(s.itemTime, c.unreadCount > 0 && s.itemTimeUnread)}>
              {now - new Date(c.lastMessage.at).getTime() < 60_000 ? 'Agora' : formatListTime(c.lastMessage.at)}
            </span>
          )}
        </span>

        <span className={s.itemMiddle}>
          {c.contactTyping ? (
            <em className={s.typing}>Digitando…</em>
          ) : (
            <span className={s.itemPreview}>
              {c.lastMessage.direction === 'outbound' && <DeliveryIcon status={c.lastMessage.deliveryStatus} />}
              {c.lastMessage.contentType === 'image' && <Camera aria-hidden className={s.previewIcon} />}
              {c.lastMessage.preview}
            </span>
          )}
          <span className={s.itemIndicators}>
            <WhatsAppIcon className={s.channelIcon} />
            {c.unreadCount > 0 && (
              <span className={s.unread} aria-label={`${c.unreadCount} não lidas`}>
                {c.unreadCount}
              </span>
            )}
          </span>
        </span>

        {(team.length > 0 || c.tags.length > 0) && (
          <span className={s.itemBottom}>
            {team.length > 0 && (
              <span className={s.team} aria-label={`Equipe: ${team.map((u) => u.name).join(', ')}`}>
                {team.map((u) => (
                  <Avatar key={u.id} name={u.name} size={20} />
                ))}
              </span>
            )}
            {c.tags.map((tag) => (
              <TagChip key={tag.id} color={tag.color}>
                {tag.name}
              </TagChip>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

export function DeliveryIcon({ status, className }: { status?: Conversation['lastMessage']['deliveryStatus']; className?: string }) {
  if (status === 'pending') return <Clock aria-label="Enviando" className={cx(s.tick, className)} />;
  if (status === 'sent') return <Check aria-label="Enviada" className={cx(s.tick, className)} />;
  if (status === 'delivered') return <CheckCheck aria-label="Entregue" className={cx(s.tick, className)} />;
  if (status === 'read') return <CheckCheck aria-label="Lida" className={cx(s.tick, s.tickRead, className)} />;
  return null;
}
