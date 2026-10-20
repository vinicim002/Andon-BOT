import { useState } from 'react';
import { DropdownMenu } from 'radix-ui';
import { AlertCircle, FileText, Globe, Link2, MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Badge, Button, DataTable, EmptyState, ErrorState, LoadingState } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { useToast } from '../../design-system/useToast';
import { sourceKind, sourceStatus } from '../../domain/labels';
import type { KnowledgeSource } from '../../domain/ai';
import type { Id } from '../../domain/types';
import { formatAgo } from '../../lib/format';
import { cx } from '../../lib/cx';
import { SourceDialog } from './SourceDialog';
import s from './Settings.module.css';

const kindIcon = { url: Globe, pdf: FileText, text: Link2 };

export function KnowledgeSettings() {
  const toast = useToast();
  const data = useQuery(api.knowledgeSources);
  const [editing, setEditing] = useState<KnowledgeSource | 'new' | null>(null);
  const [removing, setRemoving] = useState<{ source: KnowledgeSource; workflows: string[] } | null>(null);
  const [reindexing, setReindexing] = useState<Id | null>(null);

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const sources = data.data;
  const indexed = sources.filter((source) => source.status === 'indexed');
  const chunks = indexed.reduce((total, source) => total + source.chunks, 0);

  const fail = (error: unknown, fallback: string) =>
    toast({ message: error instanceof Error ? error.message : fallback, tone: 'error' });

  // Descobre quem cita a fonte antes de abrir a confirmação: o texto muda conforme a resposta.
  const askRemove = async (source: KnowledgeSource) => {
    try {
      setRemoving({ source, workflows: await api.workflowsUsingSource(source.id) });
    } catch {
      setRemoving({ source, workflows: [] });
    }
  };

  const reindex = async (source: KnowledgeSource) => {
    setReindexing(source.id);
    try {
      const updated = await api.reindexSource(source.id);
      toast({
        message:
          updated.status === 'indexed'
            ? `${updated.name}: ${updated.chunks} fragmentos indexados.`
            : `${updated.name}: ${updated.error ?? 'não foi possível indexar.'}`,
        tone: updated.status === 'indexed' ? 'success' : 'error',
      });
    } catch (error) {
      fail(error, 'Não foi possível reindexar.');
    } finally {
      setReindexing(null);
    }
  };

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Base de conhecimento</h2>
          <p className={s.description}>
            O que a IA pode usar para responder. Só fonte indexada é citada — e toda resposta aponta o trecho de onde veio.
          </p>
        </div>
        <Button variant="primary" icon={<Plus />} onClick={() => setEditing('new')}>
          Nova fonte
        </Button>
      </header>

      <dl className={s.kbSummary}>
        <div>
          <dt>Fontes indexadas</dt>
          <dd>
            {indexed.length}
            <span>/{sources.length}</span>
          </dd>
        </div>
        <div>
          <dt>Fragmentos</dt>
          <dd>{chunks}</dd>
        </div>
        <div>
          <dt>Com problema</dt>
          <dd className={sources.some((source) => source.status === 'error') ? s.statAlert : undefined}>
            {sources.filter((source) => source.status === 'error').length}
          </dd>
        </div>
      </dl>

      {sources.length === 0 ? (
        <EmptyState title="Nenhuma fonte ainda" description="Sem fonte indexada, a IA entrega todo atendimento para uma pessoa." />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Fonte</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Fragmentos</th>
              <th>Indexada</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => {
              const Icon = kindIcon[source.kind];
              const state = sourceStatus[source.status];
              return (
                <tr key={source.id}>
                  <td>
                    <span className={s.sourceCell}>
                      <span className={s.sourceIcon} aria-hidden>
                        <Icon />
                      </span>
                      <span>
                        {source.name}
                        {source.origin && <small>{source.origin}</small>}
                      </span>
                    </span>
                  </td>
                  <td>{sourceKind[source.kind].label}</td>
                  <td>
                    <span className={s.runResult}>
                      <Badge tone={state.tone}>{state.label}</Badge>
                      {source.error && <small>{source.error}</small>}
                    </span>
                  </td>
                  <td className={s.runNumber}>{source.chunks}</td>
                  <td>{source.lastIndexedAt ? formatAgo(source.lastIndexedAt) : '—'}</td>
                  <td className={s.rowActions}>
                    <Button
                      variant="ghost"
                      iconOnlyLabel={`Reindexar ${source.name}`}
                      icon={<RefreshCw />}
                      disabled={reindexing === source.id}
                      onClick={() => reindex(source)}
                    />
                    <Button
                      variant="ghost"
                      iconOnlyLabel={`Editar ${source.name}`}
                      icon={<Pencil />}
                      onClick={() => setEditing(source)}
                    />
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" iconOnlyLabel={`Mais ações para ${source.name}`} icon={<MoreHorizontal />} />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                          <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} onSelect={() => askRemove(source)}>
                            <Trash2 aria-hidden /> Remover fonte
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {sources.some((source) => source.status === 'indexing') && (
        <p className={s.warning}>
          <AlertCircle aria-hidden /> Fontes em indexação ainda não podem ser citadas. Use “Reindexar” para concluir.
        </p>
      )}

      <SourceDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        source={editing === 'new' ? undefined : (editing ?? undefined)}
        onSaved={(message) => {
          setEditing(null);
          toast({ message });
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remover ${removing?.source.name ?? ''}?`}
        confirmLabel="Remover fonte"
        destructive
        onConfirm={async () => {
          if (!removing) return;
          const { source } = removing;
          setRemoving(null);
          try {
            await api.deleteSource(source.id);
            toast({ message: `${source.name} removida.` });
          } catch (error) {
            fail(error, 'Não foi possível remover a fonte.');
          }
        }}
      >
        {removing && removing.workflows.length > 0 ? (
          <p>
            Esta fonte é citada em <strong>{removing.workflows.join(', ')}</strong>, então não pode ser removida. Tire a fonte do passo
            de IA desses workflows primeiro.
          </p>
        ) : (
          <p>
            Os fragmentos indexados são apagados e as respostas anteriores perdem a referência. Se a política da IA usa esta fonte, a
            referência também é limpa.
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
