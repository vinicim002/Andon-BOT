import { useState, type FormEvent } from 'react';
import { AlertCircle, Check, Quote, Send, ShieldAlert, Sparkles, UserCheck, X } from 'lucide-react';
import { api } from '../../api';
import { useQuery } from '../../api/useQuery';
import { Badge, Button, ErrorState, LoadingState } from '../../design-system/components';
import { Field, Segmented, Select, TextInput } from '../../design-system/forms';
import { useToast } from '../../design-system/useToast';
import { aiAutonomy, sourceKind } from '../../domain/labels';
import type { AiAnswer, AiAutonomy, AiPolicy, KnowledgeSource } from '../../domain/ai';
import type { Id, OperationalQueue } from '../../domain/types';
import { cx } from '../../lib/cx';
import s from './Settings.module.css';

export function AiSettings() {
  const data = useQuery(() => Promise.all([api.aiPolicy(), api.knowledgeSources(), api.queues()]));

  if (data.status === 'loading') return <LoadingState />;
  if (data.status === 'error') return <ErrorState error={data.error} />;
  const [policy, sources, queues] = data.data;

  return (
    <>
      <header className={s.header}>
        <div>
          <h2 className={s.title}>Agente de IA</h2>
          <p className={s.description}>
            Até onde a IA pode ir sozinha, com quais fontes, e quando ela precisa entregar o atendimento para uma pessoa.
          </p>
        </div>
      </header>

      <PolicyForm policy={policy} sources={sources} queues={queues} />
      <AskPanel policy={policy} />
    </>
  );
}

type FormProps = { policy: AiPolicy; sources: KnowledgeSource[]; queues: OperationalQueue[] };

function PolicyForm({ policy, sources, queues }: FormProps) {
  const toast = useToast();
  const [draft, setDraft] = useState<AiPolicy>(policy);
  const [topic, setTopic] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof AiPolicy>(key: K, value: AiPolicy[K]) => setDraft((v) => ({ ...v, [key]: value }));
  const indexed = sources.filter((source) => source.status === 'indexed');
  const off = draft.autonomy === 'off';

  const addTopic = () => {
    const clean = topic.trim();
    if (!clean || draft.blockedTopics.includes(clean)) return;
    set('blockedTopics', [...draft.blockedTopics, clean]);
    setTopic('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.saveAiPolicy(draft);
      toast({ message: 'Política da IA atualizada.' });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={s.aiForm} onSubmit={save} noValidate>
      <fieldset className={s.fieldset}>
        <legend className={s.aiLegend}>Autonomia</legend>
        <Segmented<AiAutonomy>
          label="Autonomia da IA"
          value={draft.autonomy}
          onChange={(autonomy) => set('autonomy', autonomy)}
          options={[
            { value: 'off', label: 'Desligada' },
            { value: 'suggest', label: 'Sugere' },
            { value: 'reply', label: 'Responde' },
            { value: 'act', label: 'Responde e age' },
          ]}
        />
        <p className={cx(s.aiAutonomyNote, s[`tone-${aiAutonomy[draft.autonomy].tone}`])}>
          {aiAutonomy[draft.autonomy].description}
        </p>
      </fieldset>

      <fieldset className={s.fieldset} disabled={off}>
        <legend className={s.aiLegend}>Fontes permitidas</legend>
        {indexed.length === 0 ? (
          <p className={s.helper}>Nenhuma fonte indexada. Cadastre em Base de conhecimento antes de ligar a IA.</p>
        ) : (
          <div className={s.checkGrid}>
            {indexed.map((source) => {
              const checked = draft.sourceIds.includes(source.id);
              return (
                <label key={source.id} className={cx(s.checkCard, checked && s.checkCardOn)}>
                  <input
                    type="checkbox"
                    className="visually-hidden"
                    checked={checked}
                    onChange={() =>
                      set('sourceIds', checked ? draft.sourceIds.filter((id) => id !== source.id) : [...draft.sourceIds, source.id])
                    }
                  />
                  <span className={s.checkText}>
                    <strong>{source.name}</strong>
                    <span>
                      {sourceKind[source.kind].label} · {source.chunks} fragmentos
                    </span>
                  </span>
                  <span className={cx(s.checkbox, checked && s.checkboxOn)} aria-hidden>
                    {checked && <Check />}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <p className={s.helper}>
          {draft.sourceIds.length === 0
            ? 'Nenhuma escolhida: a IA pode usar todas as fontes indexadas.'
            : `${draft.sourceIds.length} de ${indexed.length} — a IA não cita nada fora disso.`}
        </p>
      </fieldset>

      <fieldset className={s.fieldset} disabled={off}>
        <legend className={s.aiLegend}>Entrega para uma pessoa</legend>

        <label className={s.defaultToggle}>
          <input type="checkbox" checked={draft.requireCitation} onChange={(e) => set('requireCitation', e.target.checked)} />
          <span>
            <strong>Exigir citação</strong>
            Sem um trecho de fonte que sustente a resposta, a IA não responde — entrega. É a proteção contra resposta inventada.
          </span>
        </label>

        <div className={s.formRow}>
          <Field label="Respostas antes de entregar" hint="Entre 1 e 10." className={s.grow}>
            {(id) => (
              <TextInput
                id={id}
                type="number"
                min={1}
                max={10}
                value={draft.maxRepliesBeforeHandoff}
                onChange={(e) => set('maxRepliesBeforeHandoff', Number(e.target.value))}
              />
            )}
          </Field>
          <Field label="Fila que recebe" className={s.grow}>
            {(id) => (
              <Select id={id} value={draft.handoffQueueId ?? ''} onChange={(e) => set('handoffQueueId', e.target.value || undefined)}>
                <option value="">Escolha a fila</option>
                {queues.map((queue) => (
                  <option key={queue.id} value={queue.id}>
                    {queue.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </fieldset>

      <fieldset className={s.fieldset} disabled={off}>
        <legend className={s.aiLegend}>Assuntos bloqueados</legend>
        <p className={s.helper}>A IA nem tenta responder: vai direto para uma pessoa.</p>
        <div className={s.topicRow}>
          <TextInput
            aria-label="Novo assunto bloqueado"
            placeholder="Ex.: cancelamento de contrato"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTopic();
              }
            }}
          />
          <Button variant="secondary" onClick={addTopic}>
            Adicionar
          </Button>
        </div>
        <div className={s.topicChips}>
          {draft.blockedTopics.length === 0 && <span className={s.muted}>Nenhum assunto bloqueado.</span>}
          {draft.blockedTopics.map((blocked) => (
            <span key={blocked} className={s.topicChip}>
              <ShieldAlert aria-hidden /> {blocked}
              <button
                type="button"
                aria-label={`Remover ${blocked}`}
                onClick={() => set('blockedTopics', draft.blockedTopics.filter((t) => t !== blocked))}
              >
                <X aria-hidden />
              </button>
            </span>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className={s.channelError} role="alert">
          <AlertCircle aria-hidden /> {error}
        </p>
      )}

      <div className={s.aiActions}>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar política'}
        </Button>
      </div>
    </form>
  );
}

// Teste de pergunta: usa a política salva, não o rascunho do formulário — é o comportamento
// que está valendo no atendimento neste momento.
function AskPanel({ policy }: { policy: AiPolicy }) {
  const [question, setQuestion] = useState('Qual o prazo de entrega para o Nordeste?');
  const [answer, setAnswer] = useState<AiAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');

  const ask = async (event: FormEvent) => {
    event.preventDefault();
    setAsking(true);
    setError('');
    try {
      setAnswer(await api.askAi(question));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível perguntar.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <section className={s.runsSection}>
      <header className={s.runsHeader}>
        <div>
          <h3 className={s.title}>Testar a IA</h3>
          <p className={s.description}>
            Vale a política salva ({aiAutonomy[policy.autonomy].label.toLowerCase()}). Salve antes de testar uma mudança.
          </p>
        </div>
      </header>

      <form className={s.topicRow} onSubmit={ask}>
        <TextInput
          aria-label="Pergunta de teste"
          placeholder="Pergunte como um cliente perguntaria"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <Button type="submit" variant="secondary" icon={<Send />} disabled={asking || !question.trim()}>
          {asking ? 'Perguntando…' : 'Perguntar'}
        </Button>
      </form>

      {error && (
        <p className={s.channelError} role="alert">
          <AlertCircle aria-hidden /> {error}
        </p>
      )}

      {answer && (
        <article className={s.answerCard}>
          {answer.handoffReason ? (
            <>
              <Badge tone="warning">
                <UserCheck aria-hidden /> Entregue para atendimento humano
              </Badge>
              <p className={s.answerText}>{answer.handoffReason}</p>
            </>
          ) : (
            <>
              <Badge tone="success">
                <Sparkles aria-hidden /> {policy.autonomy === 'suggest' ? 'Sugestão ao atendente' : 'Resposta ao cliente'}
              </Badge>
              <p className={s.answerText}>{answer.text}</p>
              <ul className={s.citationList}>
                {answer.citations.map((citation: { sourceId: Id; sourceName: string; snippet: string }) => (
                  <li key={citation.sourceId}>
                    <Quote aria-hidden />
                    <span>
                      <strong>{citation.sourceName}</strong>
                      <small>{citation.snippet}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {/* Uso e custo por resposta: o documento pede medir isso desde o início. */}
          <p className={s.answerMeta}>
            {answer.tokens} tokens · {answer.latencyMs} ms
          </p>
        </article>
      )}
    </section>
  );
}
