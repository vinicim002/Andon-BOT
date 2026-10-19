import type { Workflow, WorkflowDefinition } from '../../domain/workflow';

export const publishedVersion = (w: Workflow) => w.versions.find((v) => v.id === w.publishedVersionId);

// Comparação estrutural (ignora a ordem das chaves só no nível que importa: nós e ligações por id).
function normalize(def: WorkflowDefinition) {
  return JSON.stringify({
    nodes: [...def.nodes].sort((a, b) => a.id.localeCompare(b.id)).map((n) => [n.id, n.type, n.config, Math.round(n.position.x), Math.round(n.position.y)]),
    edges: [...def.edges].map((e) => `${e.source}:${e.sourceHandle}>${e.target}`).sort(),
  });
}

export function hasUnpublishedChanges(w: Workflow) {
  const published = publishedVersion(w);
  return !published || normalize(published.definition) !== normalize(w.draft);
}

// Resumo do que mudou entre a versão publicada e o rascunho (mostrado ao publicar).
export function diffDefinitions(before: WorkflowDefinition | undefined, after: WorkflowDefinition) {
  const prev = new Map((before?.nodes ?? []).map((n) => [n.id, n]));
  const next = new Map(after.nodes.map((n) => [n.id, n]));
  const added = after.nodes.filter((n) => !prev.has(n.id)).length;
  const removed = (before?.nodes ?? []).filter((n) => !next.has(n.id)).length;
  const changed = after.nodes.filter((n) => {
    const old = prev.get(n.id);
    return old && JSON.stringify([old.type, old.config]) !== JSON.stringify([n.type, n.config]);
  }).length;
  const edgeKey = (e: WorkflowDefinition['edges'][number]) => `${e.source}:${e.sourceHandle}>${e.target}`;
  const prevEdges = new Set((before?.edges ?? []).map(edgeKey));
  const nextEdges = new Set(after.edges.map(edgeKey));
  const connections = [...nextEdges].filter((k) => !prevEdges.has(k)).length + [...prevEdges].filter((k) => !nextEdges.has(k)).length;
  return { added, removed, changed, connections };
}
