import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { MoreHorizontal, Pencil, Plus, Shuffle, Star, Trash2, Hand } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Avatar, Button, ErrorState, LoadingState, Tooltip } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { WhatsAppIcon } from '../../design-system/icons';
import { useToast } from '../../design-system/useToast';
import { availability } from '../../domain/labels';
import type { ChannelEndpoint, Conversation, OperationalQueue, User } from '../../domain/types';
import { cx } from '../../lib/cx';
import { QueueDialog } from './QueueDialog';
import s from './Settings.module.css';

const ACTIVE: Conversation['status'][] = ['in_progress', 'waiting_customer', 'waiting_internal'];

export function QueuesSettings() {
  const toast = useToast();
  const data = useQuery(() => Promise.all([api.queues(), api.users(), api.endpoints(), api.conversations()]));
  const [editing, setEditing] = useState<OperationalQueue | 'new' | null>(null);
  const [deleting, setDeleting] = useState<OperationalQueue | null>(null);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [queues, users, endpoints, conversations] = data.data;
  const defaultQueue = queues.find((q) => q.isDefault);

  const run = async (action: Promise<unknown>, message: string) => {
    try {
      await action;
      toast({ message });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível concluir.', tone: 'error' });
    }
  };

  const toInput = (q: OperationalQueue) => ({ name: q.name, color: q.color, routingPolicy: q.routingPolicy, memberIds: q.memberIds, endpointIds: q.endpointIds, isDefault: q.isDefault });

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Filas</h2>
          <p className={s.description}>
            Organizam quem atende o quê. Um número de WhatsApp pode entregar conversas em várias filas, e uma fila pode atender vários números.
          </p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setEditing('new')}>
          Nova fila
        </Button>
      </header>

      <div className={s.queueGrid}>
        {queues.map((queue) => (
          <QueueCard
            key={queue.id}
            queue={queue}
            users={users}
            endpoints={endpoints}
            conversations={conversations.filter((c) => c.queueId === queue.id)}
            onEdit={() => setEditing(queue)}
            onMakeDefault={() => run(api.updateQueue(queue.id, { ...toInput(queue), isDefault: true }), `${queue.name} agora é a fila padrão.`)}
            onDelete={() => setDeleting(queue)}
          />
        ))}
      </div>

      <QueueDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        queue={editing === 'new' ? undefined : (editing ?? undefined)}
        users={users}
        endpoints={endpoints}
        onSaved={(message) => {
          setEditing(null);
          toast({ message });
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir a fila ${deleting?.name ?? ''}?`}
        confirmLabel="Excluir fila"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const queue = deleting;
          setDeleting(null);
          try {
            const moved = await api.deleteQueue(queue.id);
            toast({ message: moved ? `Fila excluída. ${moved} conversa(s) foram para ${defaultQueue?.name}.` : 'Fila excluída.' });
          } catch (error) {
            toast({ message: error instanceof Error ? error.message : 'Não foi possível excluir.', tone: 'error' });
          }
        }}
      >
        {deleting && conversations.some((c) => c.queueId === deleting.id) ? (
          <p>
            As conversas desta fila vão para a fila padrão, <strong>{defaultQueue?.name}</strong>. O histórico delas é mantido.
          </p>
        ) : (
          <p>A fila não tem conversas. Essa ação não pode ser desfeita.</p>
        )}
      </ConfirmDialog>
    </>
  );
}

type CardProps = {
  queue: OperationalQueue;
  users: User[];
  endpoints: ChannelEndpoint[];
  conversations: Conversation[];
  onEdit: () => void;
  onMakeDefault: () => void;
  onDelete: () => void;
};

function QueueCard({ queue, users, endpoints, conversations, onEdit, onMakeDefault, onDelete }: CardProps) {
  const members = users.filter((u) => queue.memberIds.includes(u.id));
  const available = members.filter((u) => u.availability === 'available').length;
  const waiting = conversations.filter((c) => c.status === 'queued' && !c.assigneeId).length;
  const active = conversations.filter((c) => ACTIVE.includes(c.status)).length;
  const roundRobin = queue.routingPolicy === 'round_robin';

  return (
    <article className={s.queueCard} style={{ '--queue-color': `var(--tag-${queue.color})` } as React.CSSProperties}>
      <header className={s.queueHead}>
        <div className={s.queueName}>
          <h3>{queue.name}</h3>
          <div className={s.queueBadges}>
            {queue.isDefault && (
              <span className={cx(s.pill, s.pillDefault)}>
                <Star aria-hidden /> Padrão
              </span>
            )}
            <span className={s.pill}>
              {roundRobin ? <Shuffle aria-hidden /> : <Hand aria-hidden />}
              {roundRobin ? 'Rodízio automático' : 'Distribuição manual'}
            </span>
          </div>
        </div>
        <div className={s.queueActions}>
          <Button variant="ghost" iconOnlyLabel={`Editar ${queue.name}`} icon={<Pencil />} onClick={onEdit} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" iconOnlyLabel="Mais ações" icon={<MoreHorizontal />} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                <DropdownMenu.Item className={s.menuItem} disabled={queue.isDefault} onSelect={onMakeDefault}>
                  <Star aria-hidden /> Definir como padrão
                </DropdownMenu.Item>
                <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} disabled={queue.isDefault} onSelect={onDelete}>
                  <Trash2 aria-hidden /> Excluir fila
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      <dl className={s.stats}>
        <div>
          <dt>Aguardando</dt>
          <dd className={waiting > 0 ? s.statAlert : undefined}>{waiting}</dd>
        </div>
        <div>
          <dt>Em atendimento</dt>
          <dd>{active}</dd>
        </div>
        <div>
          <dt>Disponíveis agora</dt>
          <dd>
            {available}
            <span>/{members.length}</span>
          </dd>
        </div>
      </dl>

      <div className={s.queueRow}>
        <span className={s.rowLabel}>Equipe</span>
        {members.length === 0 ? (
          <span className={s.muted}>Ninguém nesta fila</span>
        ) : (
          <div className={s.memberList}>
            {members.map((u) => (
              <Tooltip
                key={u.id}
                side="top"
                content={`${u.name} — ${u.availability === 'paused' && u.pauseReason ? `Em pausa (${u.pauseReason})` : availability[u.availability].label}`}
              >
                <span className={s.member} tabIndex={0}>
                  <Avatar name={u.name} size={28} presence={u.availability} />
                </span>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      <div className={s.queueRow}>
        <span className={s.rowLabel}>Canais</span>
        <div className={s.channelList}>
          {queue.endpointIds.length === 0 ? (
            <span className={s.muted}>Nenhum número vinculado</span>
          ) : (
            endpoints
              .filter((e) => queue.endpointIds.includes(e.id))
              .map((e) => (
                <span key={e.id} className={s.channel}>
                  <WhatsAppIcon /> {e.name}
                </span>
              ))
          )}
        </div>
      </div>

      {roundRobin && waiting > 0 && available === 0 && (
        <p className={s.warning}>Há conversas esperando e ninguém disponível nesta fila.</p>
      )}
    </article>
  );
}
