import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DropdownMenu } from 'radix-ui';
import { ArrowRightLeft, Bot, BotOff, Check, CheckCheck, Clock, Send, UserCheck } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Avatar, Badge, Button, LoadingState } from '../../design-system/components';
import { conversationStatus } from '../../domain/labels';
import type { Conversation, Id, Message, OperationalQueue, User } from '../../domain/types';
import { formatTime } from '../../lib/format';
import s from './Inbox.module.css';

type Props = {
  conversation: Conversation;
  extraMessages: Message[];
  queues: OperationalQueue[];
  users: User[];
  me: User;
  onAssign: () => void;
  onTransfer: (queueId: Id) => void;
  onToggleBot: () => void;
  onResolve: () => void;
  onSend: (body: string, internal: boolean) => void;
};

export function ConversationView(props: Props) {
  const { conversation, extraMessages, queues, users, me } = props;
  const loaded = useQuery(() => api.messages(conversation.id), conversation.id);
  const messages = [...(loaded.data ?? []), ...extraMessages];
  const status = conversationStatus[conversation.status];
  const isMine = conversation.assigneeId === me.id;
  const userName = (id?: Id) => users.find((u) => u.id === id)?.name;

  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [messages.length]);

  return (
    <section className={s.conversation} aria-label={`Conversa com ${conversation.contact.name}`}>
      <header className={s.convHeader}>
        <Avatar name={conversation.contact.name} size={36} />
        <div className={s.convTitle}>
          <strong>{conversation.contact.name}</strong>
          <span>
            {conversation.contact.phone} · via {conversation.endpoint.name}
          </span>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
        <div className={s.convActions}>
          {!isMine && (
            <Button variant="primary" icon={<UserCheck />} onClick={props.onAssign}>
              Assumir
            </Button>
          )}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button icon={<ArrowRightLeft />}>Transferir</Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                <DropdownMenu.Label className={s.menuLabel}>Transferir para a fila</DropdownMenu.Label>
                {queues.map((q) => (
                  <DropdownMenu.Item
                    key={q.id}
                    className={s.menuItem}
                    disabled={q.id === conversation.queueId}
                    onSelect={() => props.onTransfer(q.id)}
                  >
                    {q.name}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          <Button
            variant="ghost"
            iconOnlyLabel={conversation.botPaused ? 'Retomar bot' : 'Pausar bot'}
            icon={conversation.botPaused ? <BotOff /> : <Bot />}
            onClick={props.onToggleBot}
          />
          <Button variant="ghost" icon={<CheckCheck />} onClick={props.onResolve} disabled={conversation.status === 'resolved'}>
            Resolver
          </Button>
        </div>
      </header>

      <div className={s.messages}>
        {loaded.status === 'loading' ? (
          <LoadingState label="Carregando mensagens…" />
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} authorName={userName(m.senderUserId)} />)
        )}
        <div ref={endRef} />
      </div>

      <Composer onSend={props.onSend} disabled={!isMine} />
    </section>
  );
}

function MessageBubble({ message, authorName }: { message: Message; authorName?: string }) {
  if (message.senderType === 'system') {
    return <div className={s.systemEvent}>{message.body}</div>;
  }

  const kind = message.direction === 'internal' ? s.internal : message.direction === 'outbound' ? s.outbound : s.inbound;
  const author = message.senderType === 'bot' ? 'Bot' : message.direction === 'internal' ? `Nota de ${authorName}` : authorName;

  return (
    <div className={`${s.bubble} ${kind}`}>
      {message.direction !== 'inbound' && author && <span className={s.bubbleAuthor}>{author}</span>}
      <p>{message.body}</p>
      <span className={s.bubbleMeta}>
        {formatTime(message.createdAt)}
        {message.deliveryStatus === 'pending' && <Clock aria-label="Enviando" />}
        {message.deliveryStatus === 'sent' && <Check aria-label="Enviada" />}
        {(message.deliveryStatus === 'delivered' || message.deliveryStatus === 'read') && (
          <CheckCheck aria-label={message.deliveryStatus === 'read' ? 'Lida' : 'Entregue'} className={message.deliveryStatus === 'read' ? s.read : undefined} />
        )}
      </span>
    </div>
  );
}

function Composer({ onSend, disabled }: { onSend: (body: string, internal: boolean) => void; disabled: boolean }) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text) return;
    onSend(text, internal);
    setBody('');
  };

  return (
    <form className={`${s.composer} ${internal ? s.composerInternal : ''}`} onSubmit={submit}>
      <div className={s.composerModes} role="radiogroup" aria-label="Tipo de mensagem">
        <button type="button" role="radio" aria-checked={!internal} className={!internal ? s.modeActive : s.mode} onClick={() => setInternal(false)}>
          Responder
        </button>
        <button type="button" role="radio" aria-checked={internal} className={internal ? s.modeActive : s.mode} onClick={() => setInternal(true)}>
          Nota interna
        </button>
      </div>
      <div className={s.composerRow}>
        <label htmlFor="composer" className="visually-hidden">
          Mensagem
        </label>
        <textarea
          id="composer"
          rows={2}
          value={body}
          disabled={disabled}
          placeholder={disabled ? 'Assuma a conversa para responder' : internal ? 'Visível apenas para a equipe' : 'Escreva uma mensagem'}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) submit(e);
          }}
        />
        <Button type="submit" variant="primary" iconOnlyLabel="Enviar" icon={<Send />} disabled={disabled || !body.trim()} />
      </div>
    </form>
  );
}
