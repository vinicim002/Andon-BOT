import { Fragment, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { ArrowRightLeft, Bot, BotOff, Camera, CheckCircle2, Forward, MoreHorizontal, Phone, RotateCcw, Ticket, UserCheck } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { BrandSymbol } from '../../design-system/BrandSymbol';
import { Avatar, Button, LoadingState, Tooltip } from '../../design-system/components';
import { WhatsAppIcon } from '../../design-system/icons';
import type { Conversation, Id, Message, OperationalQueue, QuickReply, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import { formatDayLabel, formatTime, isSameDay } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { Composer } from './Composer';
import { DeliveryIcon } from './ConversationList';
import s from './Inbox.module.css';

type Props = {
  conversation: Conversation;
  queues: OperationalQueue[];
  users: User[];
  me: User;
  quickReplies: QuickReply[];
  onAssign: () => void;
  onTransfer: () => void;
  onOpenTicket: () => void;
  onToggleBot: () => void;
  onResolve: () => void;
  onReopen: () => void;
  onSend: (body: string, internal: boolean) => void;
};

export function ConversationView(props: Props) {
  const { conversation: c, queues, users, me } = props;
  const loaded = useQuery(() => api.messages(c.id), c.id);
  const messages = loaded.data ?? [];
  const userById = (id?: Id) => users.find((u) => u.id === id);
  const assignee = userById(c.assigneeId);
  const queue = queues.find((q) => q.id === c.queueId);
  const isMine = c.assigneeId === me.id;
  const resolved = c.status === 'resolved' || c.status === 'closed';
  const now = useNow(30_000);
  const windowClosed = !c.windowExpiresAt || new Date(c.windowExpiresAt).getTime() < now;

  const endRef = useRef<HTMLDivElement>(null);
  const scrollToEnd = () => endRef.current?.scrollIntoView({ block: 'end' });
  useEffect(() => {
    scrollToEnd();
  }, [messages.length]);

  const subtitle = assignee
    ? `atribuído a ${assignee.id === me.id ? 'você' : assignee.name}`
    : queue
      ? `na fila ${queue.name}`
      : c.botPaused
        ? 'sem responsável'
        : 'em atendimento automático';

  return (
    <section className={s.conversation} aria-label={`Conversa com ${c.contact.name}`}>
      <header className={s.convHeader}>
        <Avatar name={c.contact.name} size={38} />
        <div className={s.convTitle}>
          <strong>{c.contact.name}</strong>
          <span>
            <WhatsAppIcon className={s.convChannel} />#{c.contact.code} {subtitle}
          </span>
        </div>

        <div className={s.convActions}>
          <Tooltip content="Ligação (em breve)" side="bottom">
            <span>
              <Button variant="ghost" iconOnlyLabel="Ligar" icon={<Phone />} disabled />
            </span>
          </Tooltip>
          {!isMine && !resolved && (
            <Button variant="primary" icon={<UserCheck />} onClick={props.onAssign}>
              Assumir
            </Button>
          )}
          {resolved ? (
            <Button icon={<RotateCcw />} onClick={props.onReopen}>
              Reabrir
            </Button>
          ) : (
            <Button icon={<CheckCircle2 />} onClick={props.onResolve}>
              Resolver
            </Button>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" iconOnlyLabel="Mais ações" icon={<MoreHorizontal />} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                <DropdownMenu.Item className={s.menuItem} disabled={resolved} onSelect={props.onTransfer}>
                  <ArrowRightLeft aria-hidden /> Transferir…
                </DropdownMenu.Item>
                <DropdownMenu.Item className={s.menuItem} disabled={resolved} onSelect={props.onToggleBot}>
                  {c.botPaused ? <Bot aria-hidden /> : <BotOff aria-hidden />}
                  {c.botPaused ? 'Retomar bot' : 'Pausar bot'}
                </DropdownMenu.Item>
                <DropdownMenu.Separator className={s.menuSeparator} />
                {c.ticketId ? (
                  <DropdownMenu.Item className={s.menuItem} asChild>
                    <Link to={`/tickets/${c.ticketId}`}>
                      <Ticket aria-hidden /> Ver ticket
                    </Link>
                  </DropdownMenu.Item>
                ) : (
                  <DropdownMenu.Item className={s.menuItem} onSelect={props.onOpenTicket}>
                    <Ticket aria-hidden /> Abrir ticket…
                  </DropdownMenu.Item>
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      <div className={s.messages}>
        {loaded.status === 'loading' ? (
          <LoadingState label="Carregando mensagens…" />
        ) : (
          messages.map((m, i) => (
            <Fragment key={m.id}>
              {(i === 0 || !isSameDay(messages[i - 1].createdAt, m.createdAt)) && (
                <div className={s.daySeparator}>
                  <span>{formatDayLabel(m.createdAt)}</span>
                </div>
              )}
              {/* Imagens mudam a altura depois de carregar; rola de novo para não parar no meio. */}
              <MessageRow message={m} author={userById(m.senderUserId)} onMediaLoad={scrollToEnd} />
            </Fragment>
          ))
        )}
        <div ref={endRef} />
      </div>

      {resolved ? (
        <div className={s.composerNotice}>
          <CheckCircle2 aria-hidden /> Atendimento resolvido. Reabra para enviar novas mensagens.
        </div>
      ) : !isMine ? (
        <div className={s.composerNotice}>
          <UserCheck aria-hidden />
          {assignee ? `Este atendimento está com ${assignee.name}.` : 'Este atendimento ainda não tem responsável.'}
          <Button variant="primary" onClick={props.onAssign}>
            Assumir atendimento
          </Button>
        </div>
      ) : (
        <Composer onSend={props.onSend} windowClosed={windowClosed} quickReplies={props.quickReplies} contactName={c.contact.name} />
      )}
    </section>
  );
}

function MessageRow({ message: m, author, onMediaLoad }: { message: Message; author?: User; onMediaLoad: () => void }) {
  if (m.senderType === 'system') {
    return <div className={s.systemEvent}>{m.body}</div>;
  }

  const inbound = m.direction === 'inbound';
  const internal = m.direction === 'internal';
  const authorName = m.senderType === 'bot' ? 'Andon BOT' : author?.name;
  const imageOnly = m.contentType === 'image' && !m.body;

  return (
    <div className={cx(s.messageRow, inbound ? s.rowIn : s.rowOut)}>
      <div className={cx(s.bubble, inbound ? s.inbound : internal ? s.internal : s.outbound, imageOnly && s.mediaBubble)}>
        {!inbound && authorName && <span className={s.bubbleAuthor}>{internal ? `Nota interna · ${authorName}` : `${authorName}:`}</span>}
        {m.forwarded && (
          <span className={s.forwarded}>
            <Forward aria-hidden /> Encaminhada
          </span>
        )}
        {m.replyTo && (
          <span className={s.quote}>
            <strong>{m.replyTo.authorName}</strong>
            <span className={s.quotePreview}>
              {m.replyTo.contentType === 'image' && <Camera aria-hidden />}
              {m.replyTo.preview}
            </span>
          </span>
        )}
        {m.contentType === 'image' && m.mediaUrl && <img className={s.media} src={m.mediaUrl} alt="Imagem enviada pelo contato" onLoad={onMediaLoad} />}
        {m.body && <p>{m.body}</p>}
        <span className={cx(s.bubbleMeta, imageOnly && s.metaOverlay)}>
          {formatTime(m.createdAt)}
          <DeliveryIcon status={m.deliveryStatus} />
        </span>
      </div>
      {!inbound &&
        (m.senderType === 'bot' ? (
          <span className={s.botAvatar} aria-hidden>
            <BrandSymbol className={s.botSymbol} label="" />
          </span>
        ) : (
          author && <Avatar name={author.name} size={26} />
        ))}
    </div>
  );
}
