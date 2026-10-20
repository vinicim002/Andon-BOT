import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { DropdownMenu } from 'radix-ui';
import { Copy, MoreHorizontal, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useCurrentUser } from '../../app/permissions';
import { Badge, Button, DataTable, EmptyState, ErrorState, LoadingState, MobileList, MobileListRow, Page, PageHeader } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/useToast';
import type { Workflow, WorkflowTemplate } from '../../domain/workflow';
import { templateInfo } from '../../domain/workflowTemplates';
import { cx } from '../../lib/cx';
import { formatAgo } from '../../lib/format';
import { useIsMobile } from '../../lib/useIsMobile';
import { triggerLabel } from './catalog';
import { publishedVersion, hasUnpublishedChanges } from './versioning';
import s from './Workflows.module.css';

export function WorkflowsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { me } = useCurrentUser();
  const data = useQuery(() => Promise.all([api.workflows(), api.users()]));
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Workflow | null>(null);
  const mobile = useIsMobile();

  if (data.status === 'loading' || !me) return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [workflows, users] = data.data;
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? 'alguém';

  const run = async (action: Promise<unknown>, message: string) => {
    try {
      await action;
      toast({ message });
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível concluir.', tone: 'error' });
    }
  };

  const create = async (template: WorkflowTemplate) => {
    const workflow = await api.createWorkflow(template, me.id);
    setCreating(false);
    navigate(`/workflows/${workflow.id}`);
  };

  return (
    <Page>
      <PageHeader
        title="Workflows"
        description="Automações que conduzem a conversa antes (ou no lugar) do atendimento humano. O rascunho não afeta o atendimento até ser publicado."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
            Novo workflow
          </Button>
        }
      />

      {workflows.length === 0 ? (
        <EmptyState title="Nenhum workflow ainda" description="Comece por um modelo pronto — leva menos de um minuto." />
      ) : mobile ? (
        <MobileList>
          {[...workflows]
            .sort((a, b) => b.draftUpdatedAt.localeCompare(a.draftUpdatedAt))
            .map((w) => {
              const published = publishedVersion(w);
              const pending = hasUnpublishedChanges(w);
              return (
                <MobileListRow
                  key={w.id}
                  to={`/workflows/${w.id}`}
                  leading={<span className={s.workflowMark}>{w.name.slice(0, 1).toUpperCase()}</span>}
                  title={w.name}
                  meta={w.stats.runs24h ? `${w.stats.runs24h} hoje` : 'Sem execuções'}
                  subtitle={w.description || triggerLabel((published?.definition ?? w.draft).nodes)}
                  footer={
                    <>
                      {!published ? <Badge tone="neutral">Nunca publicado</Badge> : <Badge tone={w.status === 'active' ? 'success' : 'warning'}>{w.status === 'active' ? `Ativo · v${published.number}` : `Pausado · v${published.number}`}</Badge>}
                      {pending && <span className={s.pending}>Alterações não publicadas</span>}
                    </>
                  }
                  trailing={
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" iconOnlyLabel={`Ações para ${w.name}`} icon={<MoreHorizontal />} />
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                          <DropdownMenu.Item className={s.menuItem} onSelect={() => navigate(`/workflows/${w.id}`)}><Pencil aria-hidden /> Abrir editor</DropdownMenu.Item>
                          {published && (w.status === 'active' ? <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.setWorkflowStatus(w.id, 'paused'), `${w.name} pausado.`)}><Pause aria-hidden /> Pausar</DropdownMenu.Item> : <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.setWorkflowStatus(w.id, 'active'), `${w.name} ativado.`)}><Play aria-hidden /> Ativar</DropdownMenu.Item>)}
                          <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.duplicateWorkflow(w.id, me.id), 'Cópia criada como rascunho.')}><Copy aria-hidden /> Duplicar</DropdownMenu.Item>
                          <DropdownMenu.Separator className={s.menuSeparator} />
                          <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} onSelect={() => setDeleting(w)}><Trash2 aria-hidden /> Excluir</DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  }
                />
              );
            })}
        </MobileList>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Gatilho</th>
              <th>Status</th>
              <th>Execuções (24h)</th>
              <th>Rascunho</th>
              <th>
                <span className="visually-hidden">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {[...workflows]
              .sort((a, b) => b.draftUpdatedAt.localeCompare(a.draftUpdatedAt))
              .map((w) => {
                const published = publishedVersion(w);
                const pending = hasUnpublishedChanges(w);
                return (
                  <tr key={w.id} className={s.row} onClick={() => navigate(`/workflows/${w.id}`)}>
                    <td>
                      <Link to={`/workflows/${w.id}`} className={s.name} onClick={(e) => e.stopPropagation()}>
                        {w.name}
                      </Link>
                      {w.description && <span className={s.description}>{w.description}</span>}
                    </td>
                    <td>{triggerLabel((published?.definition ?? w.draft).nodes)}</td>
                    <td>
                      <span className={s.statusCell}>
                        {!published ? (
                          <Badge tone="neutral">Nunca publicado</Badge>
                        ) : w.status === 'active' ? (
                          <Badge tone="success">Ativo · v{published.number}</Badge>
                        ) : (
                          <Badge tone="warning">Pausado · v{published.number}</Badge>
                        )}
                        {published && pending && <span className={s.pending}>alterações não publicadas</span>}
                      </span>
                    </td>
                    <td>
                      {w.stats.runs24h}
                      {w.stats.failures24h > 0 && <span className={s.failures}> · {w.stats.failures24h} falha(s)</span>}
                    </td>
                    <td className={s.muted}>
                      editado {formatAgo(w.draftUpdatedAt)} por {userName(w.draftUpdatedBy)}
                    </td>
                    <td className={s.actionsCell} onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <Button variant="ghost" iconOnlyLabel={`Ações para ${w.name}`} icon={<MoreHorizontal />} />
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content className={s.menu} align="end" sideOffset={4}>
                            <DropdownMenu.Item className={s.menuItem} onSelect={() => navigate(`/workflows/${w.id}`)}>
                              <Pencil aria-hidden /> Abrir editor
                            </DropdownMenu.Item>
                            {published &&
                              (w.status === 'active' ? (
                                <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.setWorkflowStatus(w.id, 'paused'), `${w.name} pausado.`)}>
                                  <Pause aria-hidden /> Pausar
                                </DropdownMenu.Item>
                              ) : (
                                <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.setWorkflowStatus(w.id, 'active'), `${w.name} ativado.`)}>
                                  <Play aria-hidden /> Ativar
                                </DropdownMenu.Item>
                              ))}
                            <DropdownMenu.Item className={s.menuItem} onSelect={() => run(api.duplicateWorkflow(w.id, me.id), 'Cópia criada como rascunho.')}>
                              <Copy aria-hidden /> Duplicar
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className={s.menuSeparator} />
                            <DropdownMenu.Item className={cx(s.menuItem, s.menuDanger)} onSelect={() => setDeleting(w)}>
                              <Trash2 aria-hidden /> Excluir
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

      <Modal open={creating} onOpenChange={setCreating} title="Novo workflow" description="Escolha um ponto de partida. Tudo pode ser alterado no editor." size="lg">
        <div className={s.templates}>
          {(Object.keys(templateInfo) as WorkflowTemplate[]).map((t) => (
            <button key={t} type="button" className={s.template} onClick={() => create(t)}>
              <strong>{templateInfo[t].name}</strong>
              <span>{templateInfo[t].description}</span>
            </button>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Excluir ${deleting?.name ?? ''}?`}
        confirmLabel="Excluir workflow"
        destructive
        onConfirm={() => {
          if (!deleting) return;
          const w = deleting;
          setDeleting(null);
          return run(api.deleteWorkflow(w.id), 'Workflow excluído.');
        }}
      >
        <p>O workflow para de rodar imediatamente e todas as versões são apagadas. Se quiser só interromper, use “Pausar”.</p>
      </ConfirmDialog>
    </Page>
  );
}
