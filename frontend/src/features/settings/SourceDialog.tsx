import { useState, type FormEvent } from 'react';
import { AlertCircle } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, Segmented, TextArea, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import { sourceKind } from '../../domain/labels';
import type { KnowledgeSource, SourceInput, SourceKind } from '../../domain/ai';
import s from './Settings.module.css';
import dialogs from '../inbox/dialogs.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source?: KnowledgeSource;
  onSaved: (message: string) => void;
};

export function SourceDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.source ? `Editar ${props.source.name}` : 'Nova fonte'}
      size="lg"
    >
      {props.open && <SourceForm {...props} />}
    </Modal>
  );
}

function SourceForm({ source, onOpenChange, onSaved }: Props) {
  const [input, setInput] = useState<SourceInput>({
    name: source?.name ?? '',
    kind: source?.kind ?? 'text',
    origin: source?.origin ?? '',
    content: source?.content ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof SourceInput>(key: K, value: SourceInput[K]) => setInput((v) => ({ ...v, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (source) {
        await api.saveSource(source.id, input);
        onSaved('Fonte atualizada.');
      } else {
        const created = await api.createSource(input);
        onSaved(`${created.name} cadastrada. Use “Reindexar” para ela ficar disponível.`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <Field label="Nome" hint="É este nome que aparece na citação, para o cliente e na auditoria.">
        {(id) => (
          <TextInput
            id={id}
            autoFocus
            placeholder="Ex.: Política de avarias e sinistro"
            value={input.name}
            onChange={(e) => set('name', e.target.value)}
          />
        )}
      </Field>

      <div>
        <span className={dialogs.fieldLabel}>Tipo</span>
        <Segmented<SourceKind>
          label="Tipo de fonte"
          value={input.kind}
          onChange={(kind) => set('kind', kind)}
          options={[
            { value: 'text', label: 'Texto interno' },
            { value: 'url', label: 'Página web' },
            { value: 'pdf', label: 'Documento PDF' },
          ]}
        />
        <p className={s.helper}>{sourceKind[input.kind].description}</p>
      </div>

      {input.kind === 'url' && (
        <Field label="Endereço">
          {(id) => (
            <TextInput
              id={id}
              placeholder="https://www.exemplo.com.br/ajuda/faq"
              value={input.origin}
              onChange={(e) => set('origin', e.target.value)}
            />
          )}
        </Field>
      )}

      {input.kind === 'pdf' && (
        <Field label="Arquivo" hint="O envio de arquivo entra junto com o back-end; por ora, informe o nome.">
          {(id) => (
            <TextInput
              id={id}
              placeholder="politica-avarias-v3.pdf"
              value={input.origin}
              onChange={(e) => set('origin', e.target.value)}
            />
          )}
        </Field>
      )}

      {input.kind === 'text' && (
        <Field label="Conteúdo" hint="Escreva como se fosse responder ao cliente — é esse texto que a IA vai citar.">
          {(id) => <TextArea id={id} rows={8} value={input.content} onChange={(e) => set('content', e.target.value)} />}
        </Field>
      )}

      {source && (
        <p className={s.helper}>
          Mudar o conteúdo ou o endereço devolve a fonte para “indexando”: a citação não pode apontar para um texto que não existe mais.
        </p>
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
          {saving ? 'Salvando…' : source ? 'Salvar' : 'Cadastrar fonte'}
        </Button>
      </div>
    </form>
  );
}
