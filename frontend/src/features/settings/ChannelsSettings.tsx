import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { AlertCircle, Copy, Gauge, MoreHorizontal, Pencil, Plug, Plus, Power, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Badge, Button, ErrorState, LoadingState } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { WhatsAppIcon } from '../../design-system/icons';
import { useToast } from '../../design-system/useToast';
import { channelStatus, messagingTier, qualityRating } from '../../domain/labels';
import type { ChannelEndpoint, Conversation, Id, OperationalQueue } from '../../domain/types';
import { formatAgo } from '../../lib/format';
import { cx } from '../../lib/cx';
import { ChannelDialog } from './ChannelDialog';
import s from './Settings.module.css';

export function ChannelsSettings() {
  const toast = useToast();
  const data = useQuery(() => Promise.all([api.endpoints(), api.queues(), api.conversations()]));
  const [editing, setEditing] = useState<ChannelEndpoint | 'new' | null>(null);
  const [removing, setRemoving] = useState<ChannelEndpoint | null>(null);
  // Guarda o id em teste, não um booleano: dois canais podem ser verificados em sequência.
  const [testing, setTesting] = useState<Id | null>(null);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [endpoints, queues, conversations] = data.data;

  const fail = (error: unknown, fallback: string) =>
    toast({ message: error instanceof Error ? error.message : fallback, tone: 'error' });

  const test = async (endpoint: ChannelEndpoint) => {
    setTesting(endpoint.id);
    try {
      const checked = await api.testChannel(endpoint.id);
      const ok = checked.status === 'connected';
      toast({
        message: ok
          ? `${endpoint.name} está conectado.`
          : `${endpoint.name}: ${checked.whatsapp?.lastError ?? 'falha na verificação.'}`,
        tone: ok ? 'success' : 'error',
      });
    } catch (error) {
      fail(error, 'Não foi possível verificar a conexão.');
    } finally {
      setTesting(null);
    }
  };

  const setStatus = async (endpoint: ChannelEndpoint, status: 'connected' | 'disabled') => {
    try {
      await api.setChannelStatus(endpoint.id, status);
      toast({
        message:
          status === 'disabled'
            ? `${endpoint.name} desconectado. Mensagens novas deste número não entram mais.`
            : `${endpoint.name} reconectado.`,
      });
    } catch (error) {
      fail(error, 'Não foi possível mudar o estado do canal.');
    }
  };

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Canais</h2>
          <p className={s.description}>
            Números de WhatsApp conectados pela Cloud API. Cada número entrega conversas para as filas escolhidas — e uma fila pode
            atender vários números.
          </p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setEditing('new')}>
          Conectar número
        </Button>
      </header>

      <div className={s.queueGrid}>
        {endpoints.map((endpoint) => (
          <ChannelCard
            key={endpoint.id}
            endpoint={endpoint}
            queues={queues.filter((q) => q.endpointIds.includes(endpoint.id))}
            conversations={conversations.filter((c) => c.endpoint.id === endpoint.id)}
            testing={testing === endpoint.id}
            onTest={() => test(endpoint)}
            onEdit={() => setEditing(endpoint)}
            onToggle={() => setStatus(endpoint, endpoint.status === 'disabled' ? 'connected' : 'disabled')}
            onRemove={() => setRemoving(endpoint)}
          />
        ))}
      </div>

      <p className={s.securityNote}>
        <ShieldCheck aria-hidden />
        <span>
          O token permanente é cifrado e nunca volta para esta tela — só os últimos dígitos, para conferência. Para trocá-lo, gere
          outro no painel da Meta e cole aqui.
        </span>
      </p>

      <ChannelDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        endpoint={editing === 'new' ? undefined : (editing ?? undefined)}
        queues={queues}
        onSaved={(message) => {
          setEditing(null);
          toast({ message });
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remover ${removing?.name ?? ''}?`}
        confirmLabel="Remover canal"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const endpoint = removing;
          setRemoving(null);
          try {
            await api.deleteChannel(endpoint.id);
            toast({ message: `${endpoint.name} removido.` });
          } catch (error) {
            fail(error, 'Não foi possível remover o canal.');
          }
        }}
      >
        <p>
          O número sai das filas e deixa de aparecer no console. As conversas encerradas continuam no histórico. Se a intenção é só
          parar de atender por este número, use <strong>Desconectar</strong> — dá para reverter.
        </p>
      </ConfirmDialog>
    </>
  );
}

type CardProps = {
  endpoint: ChannelEndpoint;
  queues: OperationalQueue[];
  conversations: Conversation[];
  testing: boolean;
  onTest: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
};

function ChannelCard({ endpoint, queues, conversations, testing, onTest, onEdit, onToggle, onRemove }: CardProps) {
  const config = endpoint.whatsapp;
  const state = channelStatus[endpoint.status];
  const open = conversations.filter((c) => c.status !== 'closed' && c.status !== 'resolved').length;
  const disabled = endpoint.status === 'disabled';

  return (
    <article className={cx(s.channelCard, disabled && s.channelCardOff)}>
      <header className={s.channelHead}>
        <span className={s.channelAvatar} aria-hidden>
          <WhatsAppIcon />
        </span>
        <div className={s.channelName}>
          <h3>{endpoint.name}</h3>
          <span className={s.channelAddress}>{endpoint.address}</span>
        </div>
        <div className={s.queueActions}>
          <Button variant="ghost" iconOnlyLabel={`Editar ${endpoint.name}`} icon={<Pencil />} onClick={onEdit} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" iconOnlyLabel="Mais ações" icon={<MoreHorizontal />} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                <DropdownMenu.Item className={s.menuItem} onSelect={onToggle}>
                  <Power aria-hidden /> {disabled ? 'Reconectar' : 'Desconectar'}
                </DropdownMenu.Item>
                <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} onSelect={onRemove}>
                  <Trash2 aria-hidden /> Remover canal
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      <div className={s.channelBadges}>
        <Badge tone={state.tone}>{state.label}</Badge>
        {config?.lastCheckedAt && <span className={s.pill}>Verificado {formatAgo(config.lastCheckedAt)}</span>}
      </div>

      {endpoint.status === 'error' && config?.lastError && (
        <p className={s.channelError} role="alert">
          <AlertCircle aria-hidden /> {config.lastError}
        </p>
      )}
      {endpoint.status === 'pending' && <p className={s.warning}>{state.description}</p>}

      <dl className={s.stats}>
        <div>
          <dt>Qualidade</dt>
          <dd className={config?.quality === 'red' ? s.statAlert : undefined}>
            {config?.quality ? qualityRating[config.quality].label : '—'}
          </dd>
        </div>
        <div>
          <dt>Limite de envio</dt>
          <dd className={s.statSmall}>{config?.tier ? messagingTier[config.tier] : '—'}</dd>
        </div>
        <div>
          <dt>Conversas abertas</dt>
          <dd>{open}</dd>
        </div>
      </dl>

      <div className={s.queueRow}>
        <span className={s.rowLabel}>Filas</span>
        {queues.length === 0 ? (
          // Sem fila, o número recebe mensagens que ninguém vê: é o erro de configuração mais comum.
          <span className={s.channelWarnInline}>
            <AlertCircle aria-hidden /> Nenhuma fila recebe deste número
          </span>
        ) : (
          <span className={s.queueChips}>
            {queues.map((q) => (
              <span key={q.id} className={s.queueChip}>
                <span className={s[`dot-${q.color}`]} aria-hidden /> {q.name}
              </span>
            ))}
          </span>
        )}
      </div>

      {config && (
        <details className={s.webhook} open={endpoint.status === 'pending'}>
          <summary>Dados do webhook</summary>
          <p className={s.helper}>Cole estes dois valores na configuração de webhook do aplicativo no painel da Meta.</p>
          <CopyRow label="URL de callback" value={config.webhookUrl} />
          <CopyRow label="Token de verificação" value={config.webhookVerifyToken} />
          <dl className={s.channelMeta}>
            <div>
              <dt>Nome aprovado</dt>
              <dd>{config.verifiedName}</dd>
            </div>
            <div>
              <dt>ID do número</dt>
              <dd>{config.phoneNumberId}</dd>
            </div>
            <div>
              <dt>WABA</dt>
              <dd>{config.wabaId}</dd>
            </div>
            <div>
              <dt>Token</dt>
              <dd>{config.tokenHint}</dd>
            </div>
          </dl>
        </details>
      )}

      <div className={s.channelFooter}>
        <Button variant="secondary" icon={testing ? <Gauge /> : <Plug />} onClick={onTest} disabled={testing || disabled}>
          {testing ? 'Verificando…' : 'Testar conexão'}
        </Button>
      </div>
    </article>
  );
}

// Valor somente leitura com botão de copiar: a pessoa precisa levar o texto exato para a Meta.
function CopyRow({ label, value }: { label: string; value: string }) {
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ message: `${label} copiado.` });
    } catch {
      toast({ message: 'O navegador bloqueou a cópia. Selecione o texto manualmente.', tone: 'error' });
    }
  };

  return (
    <div className={s.webhookRow}>
      <span className={s.webhookLabel}>{label}</span>
      <div className={s.linkRow}>
        <input readOnly value={value} aria-label={label} onFocus={(e) => e.currentTarget.select()} />
        <Button variant="ghost" iconOnlyLabel={`Copiar ${label}`} icon={<Copy />} onClick={copy} />
      </div>
    </div>
  );
}
