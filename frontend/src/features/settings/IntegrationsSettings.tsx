import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import {
  AlertCircle,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Power,
  RefreshCw,
  ShieldCheck,
  Timer,
  Trash2,
} from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Badge, Button, ErrorState, LoadingState } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { Select } from '../../design-system/forms';
import { useToast } from '../../design-system/useToast';
import { integrationAuth, integrationStatus } from '../../domain/labels';
import type { Integration } from '../../domain/integration';
import type { Id } from '../../domain/types';
import { cx } from '../../lib/cx';
import { IntegrationDialog } from './IntegrationDialog';
import { IntegrationRunsPanel } from './IntegrationRunsPanel';
import s from './Settings.module.css';

export function IntegrationsSettings() {
  const toast = useToast();
  const data = useQuery(() => Promise.all([api.integrations(), api.integrationRuns()]));
  const [editing, setEditing] = useState<Integration | 'new' | null>(null);
  const [removing, setRemoving] = useState<Integration | null>(null);
  const [blockedBy, setBlockedBy] = useState<{ integration: Integration; workflows: string[] } | null>(null);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [integrations, runs] = data.data;

  const fail = (error: unknown, fallback: string) =>
    toast({ message: error instanceof Error ? error.message : fallback, tone: 'error' });

  // Desativar derruba os workflows que dependem da integração: avisa quais, antes de agir.
  const toggle = async (integration: Integration) => {
    if (integration.status === 'active') {
      const workflows = await api.workflowsUsingIntegration(integration.id);
      if (workflows.length > 0) {
        setBlockedBy({ integration, workflows });
        return;
      }
    }
    await apply(integration, integration.status === 'active' ? 'disabled' : 'active');
  };

  const apply = async (integration: Integration, status: 'active' | 'disabled') => {
    try {
      await api.setIntegrationStatus(integration.id, status);
      toast({
        message:
          status === 'disabled'
            ? `${integration.name} desativada. As chamadas falham de imediato.`
            : `${integration.name} reativada.`,
      });
    } catch (error) {
      fail(error, 'Não foi possível mudar o estado da integração.');
    }
  };

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Integrações</h2>
          <p className={s.description}>
            APIs externas que os workflows podem chamar. A credencial fica aqui, cifrada — quem desenha o workflow escolhe uma
            operação da lista e nunca digita URL nem token.
          </p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setEditing('new')}>
          Nova integração
        </Button>
      </header>

      <div className={s.queueGrid}>
        {integrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            runs24h={runs.filter((r) => r.integrationId === integration.id)}
            onEdit={() => setEditing(integration)}
            onToggle={() => toggle(integration)}
            onRemove={() => setRemoving(integration)}
            onTested={(message, ok) => toast({ message, tone: ok ? 'success' : 'error' })}
            onFail={fail}
          />
        ))}
      </div>

      <p className={s.securityNote}>
        <ShieldCheck aria-hidden />
        <span>
          Tokens e senhas são cifrados e nunca voltam para esta tela — só os últimos caracteres, para conferência. Eles também não
          aparecem nos logs de execução.
        </span>
      </p>

      <IntegrationRunsPanel runs={runs} integrations={integrations} />

      <IntegrationDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        integration={editing === 'new' ? undefined : (editing ?? undefined)}
        onSaved={(message) => {
          setEditing(null);
          toast({ message });
        }}
      />

      <ConfirmDialog
        open={blockedBy !== null}
        onOpenChange={(open) => !open && setBlockedBy(null)}
        title={`Desativar ${blockedBy?.integration.name ?? ''}?`}
        confirmLabel="Desativar mesmo assim"
        destructive
        onConfirm={() => {
          if (!blockedBy) return;
          const { integration } = blockedBy;
          setBlockedBy(null);
          void apply(integration, 'disabled');
        }}
      >
        <p>
          Esta integração é usada em <strong>{blockedBy?.workflows.join(', ')}</strong>. Enquanto estiver desativada, esses passos
          falham e as conversas vão para atendimento humano.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remover ${removing?.name ?? ''}?`}
        confirmLabel="Remover integração"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const integration = removing;
          setRemoving(null);
          try {
            await api.deleteIntegration(integration.id);
            toast({ message: `${integration.name} removida.` });
          } catch (error) {
            fail(error, 'Não foi possível remover a integração.');
          }
        }}
      >
        <p>
          A credencial e os logs de execução são apagados junto. Integrações usadas em workflows não podem ser removidas — nesse caso,
          apenas desative.
        </p>
      </ConfirmDialog>
    </>
  );
}

type CardProps = {
  integration: Integration;
  runs24h: { status: string; durationMs: number }[];
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
  onTested: (message: string, ok: boolean) => void;
  onFail: (error: unknown, fallback: string) => void;
};

function IntegrationCard({ integration, runs24h, onEdit, onToggle, onRemove, onTested, onFail }: CardProps) {
  const [operationId, setOperationId] = useState<Id>(integration.operations[0]?.id ?? '');
  const [testing, setTesting] = useState(false);
  const state = integrationStatus[integration.status];
  const failures = runs24h.filter((r) => r.status === 'failed').length;
  const disabled = integration.status === 'disabled';

  const test = async () => {
    setTesting(true);
    try {
      const run = await api.testIntegration(integration.id, operationId);
      const ok = run.status === 'success';
      onTested(
        ok
          ? `${run.operationName}: ${run.httpStatus} em ${run.durationMs} ms.`
          : `${run.operationName}: ${run.error ?? 'falha na chamada.'}`,
        ok,
      );
    } catch (error) {
      onFail(error, 'Não foi possível testar.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <article className={cx(s.channelCard, disabled && s.channelCardOff)}>
      <header className={s.channelHead}>
        <span className={s.channelAvatar} aria-hidden>
          <RefreshCw />
        </span>
        <div className={s.channelName}>
          <h3>{integration.name}</h3>
          <span className={s.channelAddress}>{integration.baseUrl}</span>
        </div>
        <div className={s.queueActions}>
          <Button variant="ghost" iconOnlyLabel={`Editar ${integration.name}`} icon={<Pencil />} onClick={onEdit} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" iconOnlyLabel="Mais ações" icon={<MoreHorizontal />} />
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                <DropdownMenu.Item className={s.menuItem} onSelect={onToggle}>
                  <Power aria-hidden /> {disabled ? 'Reativar' : 'Desativar'}
                </DropdownMenu.Item>
                <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} onSelect={onRemove}>
                  <Trash2 aria-hidden /> Remover integração
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {integration.description && <p className={s.helper}>{integration.description}</p>}

      <div className={s.channelBadges}>
        <Badge tone={state.tone}>{state.label}</Badge>
        <span className={s.pill}>
          <KeyRound aria-hidden /> {integrationAuth[integration.auth.kind].label}
          {integration.auth.secretHint ? ` · ${integration.auth.secretHint}` : ''}
        </span>
        <span className={s.pill}>
          <Timer aria-hidden /> {integration.timeoutMs / 1000}s · {integration.retry.attempts}x
        </span>
      </div>

      <dl className={s.stats}>
        <div>
          <dt>Operações</dt>
          <dd>{integration.operations.length}</dd>
        </div>
        <div>
          <dt>Execuções</dt>
          <dd>{runs24h.length}</dd>
        </div>
        <div>
          <dt>Falhas</dt>
          <dd className={failures > 0 ? s.statAlert : undefined}>{failures}</dd>
        </div>
      </dl>

      {integration.operations.length > 0 && (
        <div className={s.testRow}>
          <label className={s.grow}>
            <span className="visually-hidden">Operação para testar</span>
            <Select value={operationId} onChange={(e) => setOperationId(e.target.value)}>
              {integration.operations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.method} · {o.name}
                </option>
              ))}
            </Select>
          </label>
          <Button variant="secondary" icon={<Play />} onClick={test} disabled={testing || !operationId}>
            {testing ? 'Chamando…' : 'Testar'}
          </Button>
        </div>
      )}

      {disabled && (
        <p className={s.channelError}>
          <AlertCircle aria-hidden /> {state.description}
        </p>
      )}
    </article>
  );
}
