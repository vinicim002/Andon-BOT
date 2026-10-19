import { useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Copy, Info, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../design-system/components';
import { Field, Select, TextArea, TextInput } from '../../design-system/forms';
import { ticketPriority } from '../../domain/labels';
import type { ChannelEndpoint, OperationalQueue, Tag } from '../../domain/types';
import type { ConditionOperator, NodeConfig, WorkflowDefinition, WorkflowNode } from '../../domain/workflow';
import type { ValidationIssue } from '../../domain/workflowValidation';
import { interpolate } from '../../domain/workflowRuntime';
import { cx } from '../../lib/cx';
import { catalog, operatorLabels } from './catalog';
import s from './Editor.module.css';

export type InspectorRefs = { queues: OperationalQueue[]; tags: Tag[]; endpoints: ChannelEndpoint[] };

// Variáveis disponíveis no texto: fixas + as respostas guardadas pelos passos de HTTP.
function variablesOf(def: WorkflowDefinition) {
  const saved = def.nodes.filter((n) => n.type === 'http_request').map((n) => (n.config as NodeConfig['http_request']).saveAs);
  return ['contato.nome', 'contato.nome_completo', 'mensagem', 'opcao', ...saved.map((v) => `${v}.`)];
}

// Campo de texto com atalhos para inserir {{variáveis}} onde está o cursor.
function VarText({ id, value, onChange, multiline, variables, placeholder }: { id: string; value: string; onChange: (v: string) => void; multiline?: boolean; variables: string[]; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const insert = (variable: string) => {
    const el = ref.current;
    const token = variable.endsWith('.') ? `{{${variable}campo}}` : `{{${variable}}}`;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  };
  return (
    <>
      {multiline ? (
        <TextArea id={id} ref={ref} rows={4} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <TextInput id={id} ref={ref} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className={s.varChips} aria-label="Inserir variável">
        {variables.map((v) => (
          <button key={v} type="button" className={s.varChip} onClick={() => insert(v)} title={`Inserir {{${v}${v.endsWith('.') ? 'campo' : ''}}}`}>
            {v.endsWith('.') ? `${v}…` : v}
          </button>
        ))}
      </div>
    </>
  );
}

const sample = { mensagem: 'Oi, quero saber do meu pedido', opcao: 'Acompanhar um pedido', contato: { nome: 'Fernanda', nome_completo: 'Fernanda Dias' } };

function MessagePreview({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div className={s.preview}>
      <span>Prévia (contato “Fernanda”)</span>
      <p>{interpolate(text, sample)}</p>
    </div>
  );
}

type NodeFormProps = {
  node: WorkflowNode;
  def: WorkflowDefinition;
  refs: InspectorRefs;
  issues: ValidationIssue[];
  onChange: (config: WorkflowNode['config']) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

export function NodeInspector({ node, def, refs, issues, onChange, onDelete, onDuplicate }: NodeFormProps) {
  const entry = catalog[node.type];
  const Icon = entry.icon;
  const variables = variablesOf(def);
  const c = node.config as Record<string, unknown>;
  const set = (patch: Record<string, unknown>) => onChange({ ...c, ...patch } as WorkflowNode['config']);

  let form: ReactNode = null;
  switch (node.type) {
    case 'trigger_conversation_started':
      form = (
        <Field label="Número de WhatsApp">
          {(id) => (
            <Select id={id} value={(c.endpointId as string) ?? ''} onChange={(e) => set({ endpointId: e.target.value || undefined })}>
              <option value="">Qualquer número da empresa</option>
              {refs.endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name} ({ep.address})
                </option>
              ))}
            </Select>
          )}
        </Field>
      );
      break;
    case 'trigger_message_received':
      form = <p className={s.helpText}>Dispara a cada mensagem recebida. Use uma Condição logo depois para filtrar o que interessa.</p>;
      break;
    case 'trigger_keyword':
      form = (
        <Field label="Palavras-chave" hint="Separe por vírgula. Basta a mensagem conter uma delas (maiúsculas e minúsculas tanto faz).">
          {(id) => (
            <TextInput
              id={id}
              value={(c.keywords as string[]).join(', ')}
              placeholder="pedido, rastreio, entrega"
              onChange={(e) => set({ keywords: e.target.value.split(',').map((k) => k.trimStart()) })}
            />
          )}
        </Field>
      );
      break;
    case 'condition':
      form = (
        <>
          <Field label="Campo" hint="Escolha da lista ou digite uma variável guardada, ex.: pedido.status">
            {(id) => (
              <>
                <TextInput id={id} list="condition-fields" value={c.field as string} onChange={(e) => set({ field: e.target.value.replace(/[{}\s]/g, '') })} />
                <datalist id="condition-fields">
                  {variables
                    .filter((v) => !v.endsWith('.'))
                    .map((v) => (
                      <option key={v} value={v} />
                    ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Regra">
            {(id) => (
              <Select id={id} value={c.operator as string} onChange={(e) => set({ operator: e.target.value as ConditionOperator })}>
                {(Object.keys(operatorLabels) as ConditionOperator[]).map((op) => (
                  <option key={op} value={op}>
                    {operatorLabels[op]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {c.operator !== 'exists' && <Field label="Valor">{(id) => <TextInput id={id} value={c.value as string} onChange={(e) => set({ value: e.target.value })} />}</Field>}
          <p className={s.helpText}>Se a regra for verdadeira, segue por “Sim”; senão, por “Não”.</p>
        </>
      );
      break;
    case 'menu': {
      const options = c.options as string[];
      form = (
        <>
          <Field label="Pergunta">{(id) => <VarText id={id} multiline value={c.question as string} onChange={(v) => set({ question: v })} variables={variables} />}</Field>
          <fieldset className={s.optionList}>
            <legend>Opções</legend>
            {options.map((option, i) => (
              <div key={i} className={s.optionRow}>
                <span className={s.optionNumber}>{i + 1}</span>
                <TextInput
                  aria-label={`Opção ${i + 1}`}
                  value={option}
                  maxLength={40}
                  onChange={(e) => set({ options: options.map((o, j) => (j === i ? e.target.value : o)) })}
                />
                <Button
                  variant="ghost"
                  iconOnlyLabel={`Remover opção ${i + 1}`}
                  icon={<X />}
                  disabled={options.length <= 2}
                  onClick={() => set({ options: options.filter((_, j) => j !== i), removedOption: i })}
                />
              </div>
            ))}
            {options.length < 10 && (
              <Button variant="ghost" icon={<Plus />} onClick={() => set({ options: [...options, ''] })}>
                Adicionar opção
              </Button>
            )}
          </fieldset>
          <p className={s.helpText}>O cliente responde com o número ou o texto da opção. Qualquer outra resposta segue por “Resposta inválida”.</p>
          <MessagePreview text={`${c.question as string}\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`} />
        </>
      );
      break;
    }
    case 'send_message':
      form = (
        <>
          <Field label="Mensagem">{(id) => <VarText id={id} multiline value={c.text as string} onChange={(v) => set({ text: v })} variables={variables} />}</Field>
          <MessagePreview text={c.text as string} />
        </>
      );
      break;
    case 'internal_note':
      form = <Field label="Nota (só a equipe vê)">{(id) => <VarText id={id} multiline value={c.text as string} onChange={(v) => set({ text: v })} variables={variables} />}</Field>;
      break;
    case 'transfer_queue':
      form = (
        <>
          <Field label="Fila">
            {(id) => (
              <Select id={id} value={(c.queueId as string) ?? ''} onChange={(e) => set({ queueId: e.target.value || undefined })}>
                <option value="">Selecione…</option>
                {refs.queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Resumo para a equipe" hint="Opcional. Vira nota interna na conversa.">
            {(id) => <VarText id={id} multiline value={c.summary as string} onChange={(v) => set({ summary: v })} variables={variables} />}
          </Field>
          <p className={s.helpText}>Encerra o workflow: daqui em diante, a conversa é do atendimento humano (com rodízio, se a fila usar).</p>
        </>
      );
      break;
    case 'add_tag':
      form = (
        <Field label="Etiqueta">
          {(id) => (
            <Select id={id} value={(c.tagId as string) ?? ''} onChange={(e) => set({ tagId: e.target.value || undefined })}>
              <option value="">Selecione…</option>
              {refs.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      );
      break;
    case 'open_ticket':
      form = (
        <>
          <Field label="Assunto">{(id) => <VarText id={id} value={c.subject as string} onChange={(v) => set({ subject: v })} variables={variables} />}</Field>
          <Field label="Prioridade">
            {(id) => (
              <Select id={id} value={c.priority as string} onChange={(e) => set({ priority: e.target.value })}>
                {Object.entries(ticketPriority).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <p className={s.helpText}>O protocolo fica disponível como {'{{ticket.protocolo}}'} nos passos seguintes.</p>
        </>
      );
      break;
    case 'http_request':
      form = (
        <>
          <Field label="Método">
            {(id) => (
              <Select id={id} value={c.method as string} onChange={(e) => set({ method: e.target.value })}>
                <option value="GET">GET — consultar</option>
                <option value="POST">POST — enviar</option>
              </Select>
            )}
          </Field>
          <Field label="URL">{(id) => <VarText id={id} value={c.url as string} onChange={(v) => set({ url: v })} variables={variables.filter((v) => !v.endsWith('.'))} />}</Field>
          <Field label="Guardar resposta como" hint="Depois use {{nome.campo}} nos passos seguintes.">
            {(id) => <TextInput id={id} value={c.saveAs as string} onChange={(e) => set({ saveAs: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />}
          </Field>
          <p className={s.callout}>
            <Info aria-hidden />
            <span>
              Integração simulada no teste: URLs com “pedido” ou “rastreio” devolvem um pedido de exemplo; com “erro”, a chamada falha e a conversa vai para atendimento
              humano. Credenciais ficam na área de integrações (próxima etapa).
            </span>
          </p>
        </>
      );
      break;
    case 'end':
      form = (
        <label className={s.checkRow}>
          <input type="checkbox" checked={c.resolve as boolean} onChange={(e) => set({ resolve: e.target.checked })} />
          <span>
            <strong>Resolver o atendimento</strong>
            Marca a conversa como resolvida. Sem isso, ela só sai do workflow.
          </span>
        </label>
      );
      break;
  }

  return (
    <div className={s.inspectorBody}>
      <header className={s.inspectorHead}>
        <span className={cx(s.nodeIcon, s[`group-${entry.group}`])} aria-hidden>
          <Icon />
        </span>
        <div>
          <h2>{entry.label}</h2>
          <p>{entry.description}</p>
        </div>
      </header>
      {issues.length > 0 && (
        <ul className={s.issueList}>
          {issues.map((issue, i) => (
            <li key={i}>
              <AlertCircle aria-hidden /> {issue.message}
            </li>
          ))}
        </ul>
      )}
      <div className={s.form}>{form}</div>
      <footer className={s.inspectorFooter}>
        {entry.group !== 'trigger' && (
          <Button variant="ghost" icon={<Copy />} onClick={onDuplicate}>
            Duplicar
          </Button>
        )}
        <Button variant="ghost" icon={<Trash2 />} className={s.danger} onClick={onDelete}>
          Excluir passo
        </Button>
      </footer>
    </div>
  );
}

type WorkflowPanelProps = {
  description: string;
  pauseAi: boolean;
  issues: ValidationIssue[];
  onDescription: (value: string) => void;
  onPauseAi: (value: boolean) => void;
  onSelectIssue: (nodeId: string) => void;
};

export function WorkflowInspector({ description, pauseAi, issues, onDescription, onPauseAi, onSelectIssue }: WorkflowPanelProps) {
  // Texto local enquanto digita; salva ao sair do campo (sem ida e volta ao servidor a cada tecla).
  const [text, setText] = useState(description);
  return (
    <div className={s.inspectorBody}>
      <header className={s.inspectorHead}>
        <div>
          <h2>Workflow</h2>
          <p>Selecione um passo no canvas para configurá-lo.</p>
        </div>
      </header>
      <div className={s.form}>
        <Field label="Descrição">
          {(id) => (
            <TextArea
              id={id}
              rows={2}
              value={text}
              placeholder="Para que serve este workflow"
              onChange={(e) => setText(e.target.value)}
              onBlur={() => text !== description && onDescription(text)}
            />
          )}
        </Field>
        <label className={s.checkRow}>
          <input type="checkbox" checked={pauseAi} onChange={(e) => onPauseAi(e.target.checked)} />
          <span>
            <strong>Pausar a IA enquanto este workflow conduz</strong>
            Evita que a IA e o workflow respondam ao mesmo tempo.
          </span>
        </label>
      </div>

      <section className={s.validation}>
        <h3>Validação</h3>
        {issues.length === 0 ? (
          <p className={s.valid}>
            <CheckCircle2 aria-hidden /> Tudo certo para publicar.
          </p>
        ) : (
          <ul className={s.issueList}>
            {issues.map((issue, i) => (
              <li key={i}>
                <AlertCircle aria-hidden />
                {issue.nodeId ? (
                  <button type="button" onClick={() => onSelectIssue(issue.nodeId!)}>
                    {issue.message}
                  </button>
                ) : (
                  issue.message
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={s.tips}>
        <h3>Atalhos</h3>
        <ul>
          <li>Arraste um passo da esquerda para o canvas, ou clique para adicioná-lo abaixo do selecionado (já ligado).</li>
          <li>Ligue passos puxando da bolinha de baixo até o próximo.</li>
          <li>
            <kbd>Delete</kbd> exclui o selecionado · <kbd>Ctrl</kbd>+<kbd>Z</kbd> desfaz · <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> refaz
          </li>
          <li>O rascunho salva sozinho e não afeta o atendimento até você publicar.</li>
        </ul>
      </section>
    </div>
  );
}
