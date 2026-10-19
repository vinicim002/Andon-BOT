import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useParams } from 'react-router';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircle, ArrowLeft, Check, CloudOff, FlaskConical, History, LoaderCircle, Redo2, Rocket, Undo2 } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { useCurrentUser } from '../../app/permissions';
import { Badge, Button, ErrorState, LoadingState, Tooltip, TooltipProvider } from '../../design-system/components';
import { useToast } from '../../design-system/useToast';
import type { ChannelEndpoint, OperationalQueue, Tag, User } from '../../domain/types';
import type { NodeType, Workflow, WorkflowDefinition, WorkflowNode } from '../../domain/workflow';
import { isTrigger, outputsOf, validateWorkflow } from '../../domain/workflowValidation';
import { defaultConfig } from '../../domain/workflowTemplates';
import { cx } from '../../lib/cx';
import { catalog, groupLabels, nodeSummary, nodeTypesByGroup, type NodeGroup } from './catalog';
import { NodeInspector, WorkflowInspector } from './Inspector';
import { StepNode, type RunMark, type StepFlowNode } from './StepNode';
import { TestPanel } from './TestPanel';
import { useDefinitionHistory } from './useDefinitionHistory';
import { PublishDialog, VersionsDialog } from './VersionDialogs';
import { hasUnpublishedChanges, publishedVersion } from './versioning';
import s from './Editor.module.css';

const nodeTypes = { step: StepNode };
const DND_TYPE = 'application/andon-node';
const newId = () => crypto.randomUUID().slice(0, 8);

export function WorkflowEditorPage() {
  const { workflowId = '' } = useParams();
  const { me } = useCurrentUser();
  const workflow = useQuery(() => api.workflow(workflowId), workflowId);
  const refs = useQuery(() => Promise.all([api.queues(), api.tags(), api.endpoints(), api.users()]));

  if (workflow.status === 'error') return <ErrorState error={workflow.error} />;
  if (workflow.status === 'loading' || refs.status !== 'success' || !me) return <LoadingState />;
  const [queues, tags, endpoints, users] = refs.data;

  return (
    <ReactFlowProvider>
      <TooltipProvider>
        {/* key: trocar de workflow recomeça o editor com o rascunho dele */}
        <Editor key={workflow.data.id} workflow={workflow.data} queues={queues} tags={tags} endpoints={endpoints} users={users} me={me} />
      </TooltipProvider>
    </ReactFlowProvider>
  );
}

type EditorProps = { workflow: Workflow; queues: OperationalQueue[]; tags: Tag[]; endpoints: ChannelEndpoint[]; users: User[]; me: User };
type SaveState = 'saved' | 'saving' | 'error';

function Editor({ workflow, queues, tags, endpoints, users, me }: EditorProps) {
  const toast = useToast();
  const flow = useReactFlow();
  const history = useDefinitionHistory(workflow.draft);
  const { definition: def, commit, preview, settle } = history;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<'inspect' | 'test'>('inspect');
  const [marks, setMarks] = useState<Record<string, RunMark>>({});
  const [dialog, setDialog] = useState<'publish' | 'versions' | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [name, setName] = useState(workflow.name);

  const lookup = useMemo(
    () => ({ queueName: (id?: string) => queues.find((q) => q.id === id)?.name, tagName: (id?: string) => tags.find((t) => t.id === id)?.name }),
    [queues, tags],
  );
  const issues = useMemo(() => validateWorkflow(def), [def]);
  const issuesByNode = useMemo(() => {
    const map: Record<string, typeof issues> = {};
    for (const issue of issues) if (issue.nodeId) (map[issue.nodeId] ??= []).push(issue);
    return map;
  }, [issues]);

  // ---------- Salvamento automático do rascunho ----------
  const lastSaved = useRef(JSON.stringify(workflow.draft));
  useEffect(() => {
    const serialized = JSON.stringify(def);
    if (serialized === lastSaved.current) return;
    setSaveState('saving');
    const timer = setTimeout(async () => {
      try {
        await api.saveWorkflowDraft(workflow.id, def, me.id);
        lastSaved.current = serialized;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [def, workflow.id, me.id]);

  // ---------- Conversão para o React Flow ----------
  const nodes: StepFlowNode[] = useMemo(
    () =>
      def.nodes.map((n) => ({
        id: n.id,
        type: 'step',
        position: n.position,
        selected: n.id === selectedId,
        data: { node: n, summary: nodeSummary(n, lookup), issues: issuesByNode[n.id]?.length ?? 0, run: marks[n.id] },
      })),
    [def.nodes, selectedId, lookup, issuesByNode, marks],
  );
  const edges = useMemo(
    () =>
      def.edges.map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle,
        target: e.target,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        className: cx(s.edge, (e.sourceHandle === 'no' || e.sourceHandle === 'invalid') && s.edgeAlt),
      })),
    [def.edges],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<StepFlowNode>[]) => {
      const moves = changes.filter((c) => c.type === 'position' && c.position);
      if (moves.length) {
        preview((d) => ({
          ...d,
          nodes: d.nodes.map((n) => {
            const move = moves.find((c) => c.type === 'position' && c.id === n.id);
            return move && move.type === 'position' && move.position ? { ...n, position: move.position } : n;
          }),
        }));
      }
      if (changes.some((c) => c.type === 'position' && c.dragging === false)) settle();
      const removed = changes.filter((c) => c.type === 'remove').map((c) => (c as { id: string }).id);
      if (removed.length) {
        commit((d) => ({
          ...d,
          nodes: d.nodes.filter((n) => !removed.includes(n.id)),
          edges: d.edges.filter((e) => !removed.includes(e.source) && !removed.includes(e.target)),
        }));
        setSelectedId(null);
      }
    },
    [preview, settle, commit],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = changes.filter((c) => c.type === 'remove').map((c) => (c as { id: string }).id);
      if (removed.length) commit((d) => ({ ...d, edges: d.edges.filter((e) => !removed.includes(e.id)) }));
    },
    [commit],
  );

  // Cada saída liga a um só passo: uma nova ligação substitui a anterior da mesma saída.
  const onConnect = useCallback(
    (c: Connection) => {
      if (!c.source || !c.target || c.source === c.target) return;
      const handle = c.sourceHandle ?? 'next';
      commit((d) => ({
        ...d,
        edges: [...d.edges.filter((e) => !(e.source === c.source && e.sourceHandle === handle)), { id: `${c.source}:${handle}`, source: c.source!, sourceHandle: handle, target: c.target! }],
      }));
    },
    [commit],
  );

  // ---------- Adicionar passos ----------
  const addNode = useCallback(
    (type: NodeType, at?: { x: number; y: number }) => {
      // Só existe um gatilho: escolher outro troca o tipo do atual, mantendo as ligações.
      if (isTrigger(type)) {
        const current = def.nodes.find((n) => isTrigger(n.type));
        if (current) {
          commit((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === current.id ? ({ ...n, type, config: defaultConfig(type) } as WorkflowNode) : n)) }));
          setSelectedId(current.id);
          return;
        }
      }
      const anchor = def.nodes.find((n) => n.id === selectedId);
      const freeOutput = anchor && outputsOf(anchor).find((o) => !def.edges.some((e) => e.source === anchor.id && e.sourceHandle === o.id));
      const position =
        at ??
        (anchor
          ? { x: anchor.position.x, y: anchor.position.y + 170 }
          : flow.screenToFlowPosition({ x: window.innerWidth / 2 - 130, y: window.innerHeight / 2 - 60 }));
      const id = newId();
      const node = { id, type, position, config: defaultConfig(type) } as WorkflowNode;
      commit((d) => ({
        ...d,
        nodes: [...d.nodes, node],
        // Clique na paleta já liga o passo novo à primeira saída livre do selecionado.
        edges: !at && anchor && freeOutput && !isTrigger(type) ? [...d.edges, { id: `${anchor.id}:${freeOutput.id}`, source: anchor.id, sourceHandle: freeOutput.id, target: id }] : d.edges,
      }));
      setSelectedId(id);
      setPanel('inspect');
    },
    [def, selectedId, commit, flow],
  );

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    const type = event.dataTransfer.getData(DND_TYPE) as NodeType;
    if (type in catalog) addNode(type, flow.screenToFlowPosition({ x: event.clientX - 130, y: event.clientY - 30 }));
  };

  // ---------- Edição do selecionado ----------
  const selected = def.nodes.find((n) => n.id === selectedId);

  const updateConfig = (nodeId: string, config: WorkflowNode['config']) => {
    const { removedOption, ...clean } = config as WorkflowNode['config'] & { removedOption?: number };
    commit((d) => ({
      ...d,
      nodes: d.nodes.map((n) => (n.id === nodeId ? ({ ...n, config: clean } as WorkflowNode) : n)),
      // Removeu uma opção do menu: apaga a ligação dela e renumera as seguintes.
      edges:
        removedOption === undefined
          ? d.edges
          : d.edges
              .filter((e) => !(e.source === nodeId && e.sourceHandle === `option-${removedOption}`))
              .map((e) => {
                const match = e.source === nodeId && /^option-(\d+)$/.exec(e.sourceHandle);
                if (!match || Number(match[1]) < removedOption) return e;
                const handle = `option-${Number(match[1]) - 1}`;
                return { ...e, sourceHandle: handle, id: `${nodeId}:${handle}` };
              }),
    }));
  };

  const deleteNode = (nodeId: string) => {
    commit((d) => ({ ...d, nodes: d.nodes.filter((n) => n.id !== nodeId), edges: d.edges.filter((e) => e.source !== nodeId && e.target !== nodeId) }));
    setSelectedId(null);
  };

  const duplicateNode = (node: WorkflowNode) => {
    const id = newId();
    commit((d) => ({ ...d, nodes: [...d.nodes, { ...structuredClone(node), id, position: { x: node.position.x + 40, y: node.position.y + 40 } }] }));
    setSelectedId(id);
  };

  // ---------- Atalhos de teclado ----------
  const { undo, redo } = history;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const saveInfo = async (patch: { name?: string; description?: string; pauseAi?: boolean }) => {
    try {
      await api.updateWorkflowInfo(workflow.id, patch);
    } catch (error) {
      toast({ message: error instanceof Error ? error.message : 'Não foi possível salvar.', tone: 'error' });
      if (patch.name !== undefined) setName(workflow.name);
    }
  };

  const published = publishedVersion(workflow);
  const pending = hasUnpublishedChanges({ ...workflow, draft: def });
  const publishBlocked = issues.length > 0 ? `Corrija ${issues.length} problema(s) para publicar` : !pending ? 'Nada novo para publicar' : null;
  const runContext = useMemo(() => ({ ...lookup, nodeLabel: (n: WorkflowNode) => catalog[n.type].label }), [lookup]);

  return (
    <div className={s.editor}>
      <header className={s.topbar}>
        <Link to="/workflows" className={s.back} aria-label="Voltar para workflows">
          <ArrowLeft />
        </Link>
        <input
          className={s.nameInput}
          value={name}
          aria-label="Nome do workflow"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() !== workflow.name && saveInfo({ name })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        {published ? (
          <Badge tone={workflow.status === 'active' ? 'success' : 'warning'}>
            {workflow.status === 'active' ? 'Ativo' : 'Pausado'} · v{published.number}
          </Badge>
        ) : (
          <Badge tone="neutral">Nunca publicado</Badge>
        )}
        <span className={cx(s.saveState, saveState === 'error' && s.saveError)} role="status">
          {saveState === 'saving' ? <LoaderCircle className={s.spin} aria-hidden /> : saveState === 'error' ? <CloudOff aria-hidden /> : <Check aria-hidden />}
          {saveState === 'saving' ? 'Salvando…' : saveState === 'error' ? 'Falha ao salvar' : pending ? 'Rascunho salvo · não publicado' : 'Rascunho igual ao publicado'}
        </span>

        <div className={s.topActions}>
          <Button variant="ghost" iconOnlyLabel="Desfazer (Ctrl+Z)" icon={<Undo2 />} disabled={!history.canUndo} onClick={undo} />
          <Button variant="ghost" iconOnlyLabel="Refazer (Ctrl+Shift+Z)" icon={<Redo2 />} disabled={!history.canRedo} onClick={redo} />
          {issues.length > 0 && (
            <Button
              variant="ghost"
              className={s.issuesButton}
              icon={<AlertCircle />}
              onClick={() => {
                setSelectedId(null);
                setPanel('inspect');
              }}
            >
              {issues.length} problema(s)
            </Button>
          )}
          <Button icon={<History />} onClick={() => setDialog('versions')}>
            Versões
          </Button>
          <Button icon={<FlaskConical />} onClick={() => setPanel(panel === 'test' ? 'inspect' : 'test')} aria-pressed={panel === 'test'}>
            Testar
          </Button>
          <Tooltip content={publishBlocked ?? 'Publicar o rascunho como nova versão'} side="bottom">
            <span>
              <Button variant="primary" icon={<Rocket />} disabled={Boolean(publishBlocked)} onClick={() => setDialog('publish')}>
                Publicar
              </Button>
            </span>
          </Tooltip>
        </div>
      </header>

      <div className={s.body}>
        <aside className={s.palette} aria-label="Passos disponíveis">
          {(['trigger', 'logic', 'action'] as NodeGroup[]).map((group) => (
            <section key={group}>
              <h3>{groupLabels[group]}</h3>
              {nodeTypesByGroup(group).map((type) => {
                const entry = catalog[type];
                const Icon = entry.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    draggable
                    className={s.paletteItem}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DND_TYPE, type);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => addNode(type)}
                    title={entry.description}
                  >
                    <span className={cx(s.nodeIcon, s[`group-${group}`])} aria-hidden>
                      <Icon />
                    </span>
                    <span>
                      <strong>{entry.label}</strong>
                      <small>{group === 'trigger' && def.nodes.some((n) => isTrigger(n.type)) ? 'Troca o gatilho atual' : entry.description}</small>
                    </span>
                  </button>
                );
              })}
            </section>
          ))}
        </aside>

        <div className={s.canvas} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => {
              setSelectedId(node.id);
              if (panel !== 'test') setPanel('inspect');
            }}
            onPaneClick={() => setSelectedId(null)}
            deleteKeyCode={['Delete', 'Backspace']}
            fitView
            // Enquadra sem afastar demais: abaixo de ~70% o texto dos passos fica ilegível.
            fitViewOptions={{ padding: 0.2, maxZoom: 1, minZoom: 0.7 }}
            minZoom={0.3}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1.2} className={s.background} />
            <Controls className={s.controls} showInteractive={false} />
          </ReactFlow>
        </div>

        <aside className={s.inspector} aria-label={panel === 'test' ? 'Teste' : 'Configuração'}>
          {panel === 'test' ? (
            <TestPanel definition={def} context={runContext} issues={issues.length} onMarks={setMarks} onClose={() => { setPanel('inspect'); setMarks({}); }} />
          ) : selected ? (
            <NodeInspector
              key={selected.id}
              node={selected}
              def={def}
              refs={{ queues, tags, endpoints }}
              issues={issuesByNode[selected.id] ?? []}
              onChange={(config) => updateConfig(selected.id, config)}
              onDelete={() => deleteNode(selected.id)}
              onDuplicate={() => duplicateNode(selected)}
            />
          ) : (
            <WorkflowInspector
              description={workflow.description}
              pauseAi={workflow.pauseAi}
              issues={issues}
              onDescription={(description) => saveInfo({ description })}
              onPauseAi={(pauseAi) => saveInfo({ pauseAi })}
              onSelectIssue={(nodeId) => {
                setSelectedId(nodeId);
                const node = def.nodes.find((n) => n.id === nodeId);
                if (node) flow.setCenter(node.position.x + 130, node.position.y + 60, { zoom: 1, duration: 300 });
              }}
            />
          )}
        </aside>
      </div>

      <PublishDialog open={dialog === 'publish'} onOpenChange={(o) => setDialog(o ? 'publish' : null)} workflow={workflow} draft={def} me={me} />
      <VersionsDialog
        open={dialog === 'versions'}
        onOpenChange={(o) => setDialog(o ? 'versions' : null)}
        workflow={workflow}
        users={users}
        me={me}
        onRestored={(restored: WorkflowDefinition) => {
          lastSaved.current = JSON.stringify(restored);
          history.reset(restored);
          setSelectedId(null);
        }}
      />
    </div>
  );
}
