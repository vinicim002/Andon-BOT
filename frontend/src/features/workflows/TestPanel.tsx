import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, FlaskConical, RotateCcw, Send, X, XCircle } from 'lucide-react';
import { Button } from '../../design-system/components';
import { TextInput } from '../../design-system/forms';
import type { WorkflowDefinition } from '../../domain/workflow';
import { answerMenu, startRun, type RunContext, type RunEvent, type RunState } from '../../domain/workflowRuntime';
import { cx } from '../../lib/cx';
import type { RunMark } from './StepNode';
import s from './Editor.module.css';

type Entry = RunEvent | { kind: 'user'; text: string };

type Props = {
  definition: WorkflowDefinition;
  context: Omit<RunContext, 'contactName'>;
  issues: number;
  onMarks: (marks: Record<string, RunMark>) => void;
  onClose: () => void;
};

const SUGGESTIONS = ['Olá, bom dia!', 'Quero saber do meu pedido', 'Preciso de um orçamento'];

export function TestPanel({ definition, context, issues, onMarks, onClose }: Props) {
  const [contactName, setContactName] = useState('Fernanda Dias');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [state, setState] = useState<RunState | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries.length]);

  // Marca no canvas por onde a execução passou (e onde está esperando).
  useEffect(() => {
    const marks: Record<string, RunMark> = {};
    for (const e of entries) if (e.kind === 'step') marks[e.nodeId] = e.status === 'error' ? 'error' : 'ok';
    if (state?.waitingNodeId) marks[state.waitingNodeId] = 'waiting';
    onMarks(marks);
  }, [entries, state, onMarks]);

  const reset = () => {
    setEntries([]);
    setState(null);
    setInput('');
  };

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput('');
    setBusy(true);
    const emit = (e: RunEvent) => setEntries((list) => [...list, e]);
    const ctx = { ...context, contactName };
    try {
      // Execução terminada (ou nenhuma): a nova mensagem começa outra execução, como no atendimento real.
      if (!state || state.finished) {
        setEntries((list) => [...list, ...(state?.finished ? [{ kind: 'system' as const, text: '— nova execução —' }] : []), { kind: 'user', text }]);
        setState({ ...(await startRun(definition, text, ctx, emit)) });
      } else if (state.waitingNodeId) {
        setEntries((list) => [...list, { kind: 'user', text }]);
        setState({ ...(await answerMenu(definition, { ...state, vars: { ...state.vars } }, text, ctx, emit)) });
      }
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(input);
  };

  const lastOptions = [...entries].reverse().find((e): e is Extract<RunEvent, { kind: 'bot' }> => e.kind === 'bot');
  const steps = entries.filter((e): e is Extract<RunEvent, { kind: 'step' }> => e.kind === 'step');

  return (
    <div className={s.testPanel}>
      <header className={s.testHead}>
        <FlaskConical aria-hidden />
        <div>
          <h2>Testar rascunho</h2>
          <p>Nada é enviado a clientes; a integração HTTP é simulada.</p>
        </div>
        <Button variant="ghost" iconOnlyLabel="Reiniciar teste" icon={<RotateCcw />} onClick={reset} />
        <Button variant="ghost" iconOnlyLabel="Fechar teste" icon={<X />} onClick={onClose} />
      </header>

      {issues > 0 && (
        <p className={s.testWarning}>
          <AlertTriangle aria-hidden /> O rascunho tem {issues} problema(s). Dá para testar, mas não para publicar.
        </p>
      )}

      <label className={s.contactField}>
        <span>Simular como</span>
        <TextInput value={contactName} onChange={(e) => setContactName(e.target.value)} aria-label="Nome do contato simulado" />
      </label>

      <div className={s.testChat} role="log" aria-label="Conversa de teste" aria-live="polite">
        {entries.length === 0 && (
          <div className={s.testEmpty}>
            <p>Escreva como se fosse o cliente para ver o workflow responder.</p>
            <div className={s.suggestions}>
              {SUGGESTIONS.map((sug) => (
                <button key={sug} type="button" onClick={() => send(sug)}>
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}
        {entries.map((e, i) =>
          e.kind === 'user' ? (
            <div key={i} className={cx(s.bubble, s.bubbleUser)}>
              {e.text}
            </div>
          ) : e.kind === 'bot' ? (
            <div key={i} className={cx(s.bubble, s.bubbleBot)}>
              {e.text}
              {e.options && e.options.length > 0 && (
                <ol className={s.botOptions}>
                  {e.options.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ol>
              )}
            </div>
          ) : e.kind === 'system' ? (
            <div key={i} className={s.systemLine}>
              {e.text}
            </div>
          ) : null,
        )}
        <div ref={endRef} />
      </div>

      {state?.waitingNodeId && lastOptions?.options && (
        <div className={s.quickOptions} aria-label="Responder com uma opção">
          {lastOptions.options.map((o, i) => (
            <button key={o} type="button" onClick={() => send(String(i + 1))} disabled={busy}>
              {i + 1}. {o}
            </button>
          ))}
        </div>
      )}

      <form className={s.testInput} onSubmit={submit}>
        <TextInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={state && !state.finished ? 'Responda como o cliente…' : 'Mensagem do cliente…'}
          aria-label="Mensagem do cliente"
          disabled={busy}
        />
        <Button type="submit" variant="primary" iconOnlyLabel="Enviar" icon={<Send />} disabled={!input.trim() || busy} />
      </form>

      <details className={s.runLog} open={steps.length > 0}>
        <summary>Registro de execução ({steps.length})</summary>
        <ol>
          {steps.map((step, i) => (
            <li key={i} className={s[`log-${step.status}`]}>
              {step.status === 'ok' ? <CheckCircle2 aria-hidden /> : step.status === 'error' ? <XCircle aria-hidden /> : <CircleDashed aria-hidden />}
              <span>
                <strong>{step.label}</strong>
                {step.detail}
              </span>
              <time>{step.durationMs} ms</time>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
