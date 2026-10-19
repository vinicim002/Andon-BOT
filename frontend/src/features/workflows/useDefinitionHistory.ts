import { useCallback, useState } from 'react';
import type { WorkflowDefinition } from '../../domain/workflow';

const LIMIT = 50;

type History = { present: WorkflowDefinition; past: WorkflowDefinition[]; future: WorkflowDefinition[]; moving: WorkflowDefinition | null };

type Update = WorkflowDefinition | ((current: WorkflowDefinition) => WorkflowDefinition);
const apply = (update: Update, current: WorkflowDefinition) => (typeof update === 'function' ? update(current) : update);

// Desfazer/refazer do editor, com atualizações puras (seguras no StrictMode).
// "commit" registra um passo; "preview" muda sem registrar (arrastar um nó) e "settle" fecha o
// movimento como um único passo.
export function useDefinitionHistory(initial: WorkflowDefinition) {
  const [h, setH] = useState<History>({ present: initial, past: [], future: [], moving: null });

  const commit = useCallback(
    (update: Update) => setH((s) => ({ present: apply(update, s.present), past: [...s.past, s.present].slice(-LIMIT), future: [], moving: null })),
    [],
  );

  const preview = useCallback(
    (update: (current: WorkflowDefinition) => WorkflowDefinition) => setH((s) => ({ ...s, present: update(s.present), moving: s.moving ?? s.present })),
    [],
  );

  const settle = useCallback(
    () => setH((s) => (s.moving ? { ...s, past: [...s.past, s.moving].slice(-LIMIT), future: [], moving: null } : s)),
    [],
  );

  const undo = useCallback(
    () =>
      setH((s) =>
        s.past.length ? { present: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.present, ...s.future], moving: null } : s,
      ),
    [],
  );

  const redo = useCallback(
    () => setH((s) => (s.future.length ? { present: s.future[0], past: [...s.past, s.present], future: s.future.slice(1), moving: null } : s)),
    [],
  );

  // Substitui tudo (ex.: restaurar uma versão), sem passo de desfazer para antes disso.
  const reset = useCallback((value: WorkflowDefinition) => setH({ present: value, past: [], future: [], moving: null }), []);

  return { definition: h.present, commit, preview, settle, undo, redo, reset, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
