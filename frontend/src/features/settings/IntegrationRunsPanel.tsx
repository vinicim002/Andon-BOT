import { useState } from 'react';
import { Workflow as WorkflowIcon, Hand } from 'lucide-react';
import { Badge, DataTable, EmptyState, Tooltip } from '../../design-system/components';
import { Select } from '../../design-system/forms';
import { integrationRunStatus } from '../../domain/labels';
import type { Integration, IntegrationRun } from '../../domain/integration';
import { formatAgo } from '../../lib/format';
import s from './Settings.module.css';

type Props = { runs: IntegrationRun[]; integrations: Integration[] };

// Log de execução: uma linha por chamada concluída. É o que a Fase 1 pede para depurar
// integração, e o que mostra a política de retentativa funcionando.
export function IntegrationRunsPanel({ runs, integrations }: Props) {
  const [integrationId, setIntegrationId] = useState('');
  const [onlyFailures, setOnlyFailures] = useState(false);

  const visible = runs.filter(
    (r) => (!integrationId || r.integrationId === integrationId) && (!onlyFailures || r.status === 'failed'),
  );
  const nameOf = (id: string) => integrations.find((i) => i.id === id)?.name ?? 'Integração removida';

  return (
    <section className={s.runsSection}>
      <header className={s.runsHeader}>
        <div>
          <h3 className={s.title}>Execuções</h3>
          <p className={s.description}>Chamadas feitas pelos workflows e pelos testes desta tela.</p>
        </div>
        <div className={s.runsFilters}>
          <Select aria-label="Filtrar por integração" value={integrationId} onChange={(e) => setIntegrationId(e.target.value)}>
            <option value="">Todas as integrações</option>
            {integrations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
          <label className={s.failuresToggle}>
            <input type="checkbox" checked={onlyFailures} onChange={(e) => setOnlyFailures(e.target.checked)} />
            Só falhas
          </label>
        </div>
      </header>

      {visible.length === 0 ? (
        <EmptyState
          title="Nenhuma execução"
          description={onlyFailures ? 'Nenhuma falha registrada com esse filtro.' : 'As chamadas aparecem aqui assim que acontecerem.'}
        />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Integração</th>
              <th>Operação</th>
              <th>Resultado</th>
              <th>Duração</th>
              <th>Tentativas</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((run) => (
              <tr key={run.id}>
                <td>{formatAgo(run.at)}</td>
                <td>{nameOf(run.integrationId)}</td>
                <td>
                  <span className={s.runOperation}>
                    {run.operationName}
                    <small>
                      {run.method} {run.url}
                    </small>
                  </span>
                </td>
                <td>
                  <span className={s.runResult}>
                    <Badge tone={integrationRunStatus[run.status].tone}>
                      {run.httpStatus ?? integrationRunStatus[run.status].label}
                    </Badge>
                    {run.error && <small>{run.error}</small>}
                  </span>
                </td>
                <td className={s.runNumber}>{run.durationMs} ms</td>
                <td className={s.runNumber}>
                  {/* Mais de uma tentativa significa que a retentativa entrou em ação. */}
                  {run.attempts > 1 ? (
                    <Tooltip side="top" content={`Concluída na tentativa ${run.attempts}`}>
                      <span className={s.retryMark} tabIndex={0}>
                        {run.attempts}x
                      </span>
                    </Tooltip>
                  ) : (
                    '1x'
                  )}
                </td>
                <td>
                  <span className={s.runSource}>
                    {run.source.kind === 'workflow' ? <WorkflowIcon aria-hidden /> : <Hand aria-hidden />}
                    {run.source.kind === 'workflow' ? (run.source.workflowName ?? 'Workflow') : 'Teste manual'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </section>
  );
}
