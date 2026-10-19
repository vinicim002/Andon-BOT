import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { AlertCircle } from 'lucide-react';
import type { WorkflowNode } from '../../domain/workflow';
import { isTrigger, outputsOf } from '../../domain/workflowValidation';
import { cx } from '../../lib/cx';
import { catalog } from './catalog';
import s from './Editor.module.css';

export type RunMark = 'ok' | 'error' | 'waiting';

export type StepNodeData = { node: WorkflowNode; summary: string; issues: number; run?: RunMark };
export type StepFlowNode = Node<StepNodeData, 'step'>;

function StepNodeView({ data, selected }: NodeProps<StepFlowNode>) {
  const { node, summary, issues, run } = data;
  const entry = catalog[node.type];
  const Icon = entry.icon;
  const outputs = outputsOf(node);
  const branching = outputs.length > 1;

  return (
    <div
      className={cx(s.node, s[`group-${entry.group}`], selected && s.nodeSelected, issues > 0 && s.nodeInvalid, run && s[`run-${run}`])}
      aria-label={`${entry.label}: ${summary}`}
    >
      {!isTrigger(node.type) && <Handle type="target" position={Position.Top} className={s.handleIn} />}

      <div className={s.nodeHead}>
        <span className={s.nodeIcon} aria-hidden>
          <Icon />
        </span>
        <span className={s.nodeKind}>{entry.label}</span>
        {issues > 0 && (
          <span className={s.nodeIssues} title={`${issues} problema(s)`}>
            <AlertCircle aria-hidden /> {issues}
          </span>
        )}
      </div>
      <p className={s.nodeSummary}>{summary}</p>

      {branching ? (
        <div className={s.outputs}>
          {outputs.map((out, i) => (
            <div key={out.id} className={cx(s.output, out.id === 'no' || out.id === 'invalid' ? s.outputAlt : undefined)}>
              <span>{out.label}</span>
              <Handle
                id={out.id}
                type="source"
                position={Position.Bottom}
                className={s.handleOut}
                style={{ left: `${((i + 0.5) / outputs.length) * 100}%` }}
              />
            </div>
          ))}
        </div>
      ) : (
        outputs.map((out) => <Handle key={out.id} id={out.id} type="source" position={Position.Bottom} className={s.handleOut} />)
      )}
    </div>
  );
}

export const StepNode = memo(StepNodeView);
