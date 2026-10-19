import { useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Braces } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, TextArea, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { QuickReply, QuickReplyInput } from '../../domain/types';
import dialogs from '../inbox/dialogs.module.css';
import s from './Settings.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reply?: QuickReply;
  onSaved: (message: string) => void;
};

export function QuickReplyDialog(props: Props) {
  return (
    <Modal open={props.open} onOpenChange={props.onOpenChange} title={props.reply ? `Editar /${props.reply.shortcut}` : 'Nova resposta rápida'} size="lg">
      {props.open && <QuickReplyForm {...props} />}
    </Modal>
  );
}

const SAMPLE_NAME = 'Fernanda';

function QuickReplyForm({ reply, onSaved, onOpenChange }: Props) {
  const [input, setInput] = useState<QuickReplyInput>(reply ? { shortcut: reply.shortcut, title: reply.title, body: reply.body } : { shortcut: '', title: '', body: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Insere a variável onde o cursor está, sem perder o resto do texto.
  const insertName = () => {
    const el = bodyRef.current;
    const start = el?.selectionStart ?? input.body.length;
    const end = el?.selectionEnd ?? input.body.length;
    const body = input.body.slice(0, start) + '{{nome}}' + input.body.slice(end);
    setInput((v) => ({ ...v, body }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + 8, start + 8);
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (reply) await api.updateQuickReply(reply.id, input);
      else await api.createQuickReply(input);
      onSaved(reply ? 'Resposta atualizada.' : 'Resposta rápida criada.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <div className={s.formRow}>
        <Field label="Atalho" hint="Letras, números ou hífen." className={s.shortcutField}>
          {(id) => (
            <div className={s.prefixed}>
              <span aria-hidden>/</span>
              <TextInput
                id={id}
                autoFocus
                maxLength={24}
                placeholder="saudacao"
                value={input.shortcut}
                onChange={(e) => setInput((v) => ({ ...v, shortcut: e.target.value.replace(/\s/g, '').toLowerCase() }))}
              />
            </div>
          )}
        </Field>
        <Field label="Título" className={s.grow}>
          {(id) => <TextInput id={id} maxLength={60} placeholder="Ex.: Saudação" value={input.title} onChange={(e) => setInput((v) => ({ ...v, title: e.target.value }))} />}
        </Field>
      </div>

      <Field label="Texto">
        {(id) => (
          <>
            <TextArea id={id} ref={bodyRef} rows={4} value={input.body} onChange={(e) => setInput((v) => ({ ...v, body: e.target.value }))} />
            <div>
              <Button variant="ghost" icon={<Braces />} onClick={insertName}>
                Inserir nome do contato
              </Button>
            </div>
          </>
        )}
      </Field>

      {input.body.trim() && (
        <div className={s.preview}>
          <span className={s.previewLabel}>Prévia com o contato “{SAMPLE_NAME}”</span>
          <p className={s.previewBubble}>{input.body.replace(/\{\{nome\}\}/g, SAMPLE_NAME)}</p>
        </div>
      )}

      {error && (
        <p className={dialogs.contextLine} role="alert">
          <AlertCircle aria-hidden /> {error}
        </p>
      )}

      <div className={dialogs.actions}>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Salvando…' : reply ? 'Salvar' : 'Criar resposta'}
        </Button>
      </div>
    </form>
  );
}
