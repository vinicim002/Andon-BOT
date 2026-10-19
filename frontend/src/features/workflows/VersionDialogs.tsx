import { useState } from 'react';
import { History, Play, RotateCcw, Rocket } from 'lucide-react';
import { api } from '../../api';
import { Badge, Button } from '../../design-system/components';
import { ConfirmDialog } from '../../design-system/ConfirmDialog';
import { Field, TextArea } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import { useToast } from '../../design-system/useToast';
import type { User } from '../../domain/types';
import type { Workflow, WorkflowDefinition, WorkflowVersion } from '../../domain/workflow';
import { formatAgo, formatDateTime } from '../../lib/format';
import { diffDefinitions, publishedVersion } from './versioning';
import s from './Editor.module.css';

type PublishProps = { open: boolean; onOpenChange: (open: boolean) => void; workflow: Workflow; draft: WorkflowDefinition; me: User };

export function PublishDialog(props: PublishProps) {
  const next = (props.workflow.versions.at(-1)?.number ?? 0) + 1;
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange} title={`Publicar versão ${next}`} description="A versão publicada passa a conduzir as novas conversas.">
      {props.open && <PublishForm {...props} next={next} />}
    </Modal>
  );
}

function PublishForm({ workflow, draft, me, onOpenChange, next }: PublishProps & { next: number }) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const diff = diffDefinitions(publishedVersion(workflow)?.definition, draft);
  const chips = [
    diff.added && `+${diff.added} passo(s)`,
    diff.removed && `−${diff.removed} passo(s)`,
    diff.changed && `${diff.changed} alterado(s)`,
    diff.connections && `${diff.connections} ligação(ões)`,
  ].filter(Boolean);

  const publish = async () => {
    setSaving(true);
    try {
      await api.publishWorkflow(workflow.id, note, me.id);
      toast({ message: `Versão ${next} publicada.${workflow.status === 'paused' ? ' O workflow está pausado: ative-o para rodar.' : ''}` });
      onOpenChange(false);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível publicar.', tone: 'error' });
      setSaving(false);
    }
  };

  return (
    <>
      <div className={s.diffChips}>
        {chips.length ? chips.map((c) => <span key={String(c)}>{c}</span>) : <span>Só mudanças de posição</span>}
      </div>
      <Field label="O que mudou" hint="Fica no histórico de versões para quem revisar ou precisar voltar atrás.">
        {(id) => <TextArea id={id} rows={3} autoFocus placeholder="Ex.: adiciona horário de atendimento na saudação" value={note} onChange={(e) => setNote(e.target.value)} />}
      </Field>
      <p className={s.helpText}>Conversas que já estão no meio do workflow terminam na versão em que começaram.</p>
      <div className={s.dialogActions}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button variant="primary" icon={<Rocket />} disabled={!note.trim() || saving} onClick={publish}>
          {saving ? 'Publicando…' : `Publicar v${next}`}
        </Button>
      </div>
    </>
  );
}

type HistoryProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: Workflow;
  users: User[];
  me: User;
  onRestored: (definition: WorkflowDefinition) => void;
};

export function VersionsDialog({ open, onOpenChange, workflow, users, me, onRestored }: HistoryProps) {
  const toast = useToast();
  const [confirm, setConfirm] = useState<{ kind: 'publish' | 'restore'; version: WorkflowVersion } | null>(null);
  const userName = (id: string) => users.find((u) => u.id === id)?.name ?? 'alguém';
  const latest = workflow.versions.at(-1);

  const act = async () => {
    if (!confirm) return;
    const { kind, version } = confirm;
    setConfirm(null);
    try {
      if (kind === 'publish') {
        await api.publishWorkflowVersion(workflow.id, version.id);
        toast({ message: `A versão ${version.number} voltou a rodar.` });
      } else {
        await api.restoreWorkflowVersion(workflow.id, version.id, me.id);
        onRestored(structuredClone(version.definition));
        onOpenChange(false);
        toast({ message: `Rascunho substituído pela versão ${version.number}.` });
      }
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível concluir.', tone: 'error' });
    }
  };

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title="Histórico de versões" description="Cada publicação fica guardada. Dá para voltar a qualquer uma." size="lg">
        <p className={s.draftLine}>
          <History aria-hidden /> Rascunho atual editado {formatAgo(workflow.draftUpdatedAt)} por {userName(workflow.draftUpdatedBy)}
        </p>
        {workflow.versions.length === 0 ? (
          <p className={s.helpText}>Nenhuma versão publicada ainda.</p>
        ) : (
          <ol className={s.versionList}>
            {[...workflow.versions].reverse().map((v) => {
              const running = v.id === workflow.publishedVersionId;
              return (
                <li key={v.id} className={s.version}>
                  <div className={s.versionHead}>
                    <strong>Versão {v.number}</strong>
                    {running && <Badge tone="success">{workflow.status === 'active' ? 'Rodando agora' : 'Publicada (pausada)'}</Badge>}
                    {v.id === latest?.id && !running && <Badge tone="info">Mais recente</Badge>}
                    <time>{formatDateTime(v.publishedAt)}</time>
                  </div>
                  <p>{v.note}</p>
                  <span className={s.versionMeta}>
                    por {userName(v.publishedBy)} · {v.definition.nodes.length} passos
                  </span>
                  <div className={s.versionActions}>
                    <Button variant="ghost" icon={<RotateCcw />} onClick={() => setConfirm({ kind: 'restore', version: v })}>
                      Usar como rascunho
                    </Button>
                    {!running && (
                      <Button icon={<Play />} onClick={() => setConfirm({ kind: 'publish', version: v })}>
                        Voltar a rodar esta versão
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Modal>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === 'publish' ? `Voltar a rodar a versão ${confirm.version.number}?` : `Usar a versão ${confirm?.version.number ?? ''} como rascunho?`}
        confirmLabel={confirm?.kind === 'publish' ? 'Voltar a rodar' : 'Substituir rascunho'}
        onConfirm={act}
      >
        {confirm?.kind === 'publish' ? (
          <p>As novas conversas passam a usar a versão {confirm.version.number} na hora. As versões mais novas continuam no histórico.</p>
        ) : (
          <p>O rascunho atual é substituído pelo conteúdo desta versão. A versão publicada não muda até você publicar.</p>
        )}
      </ConfirmDialog>
    </>
  );
}
