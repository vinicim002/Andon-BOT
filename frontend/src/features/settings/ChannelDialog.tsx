import { useState, type FormEvent } from 'react';
import { AlertCircle, Check, ExternalLink } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import type { ChannelEndpoint, ChannelEndpointInput, Id, OperationalQueue } from '../../domain/types';
import { cx } from '../../lib/cx';
import dialogs from '../inbox/dialogs.module.css';
import s from './Settings.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint?: ChannelEndpoint;
  queues: OperationalQueue[];
  onSaved: (message: string) => void;
};

export function ChannelDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.endpoint ? `Editar ${props.endpoint.name}` : 'Conectar número do WhatsApp'}
      size="lg"
    >
      {props.open && <ChannelForm {...props} />}
    </Modal>
  );
}

const toggle = (list: Id[], id: Id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function ChannelForm({ endpoint, queues, onSaved, onOpenChange }: Props) {
  const [input, setInput] = useState<ChannelEndpointInput>({
    name: endpoint?.name ?? '',
    address: endpoint?.address ?? '',
    wabaId: endpoint?.whatsapp?.wabaId ?? '',
    phoneNumberId: endpoint?.whatsapp?.phoneNumberId ?? '',
    // Na edição começa vazio de propósito: o token atual não desce do back-end.
    accessToken: '',
    queueIds: queues.filter((q) => endpoint && q.endpointIds.includes(endpoint.id)).map((q) => q.id),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ChannelEndpointInput>(key: K, value: ChannelEndpointInput[K]) =>
    setInput((v) => ({ ...v, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (endpoint) {
        await api.updateChannel(endpoint.id, input);
        onSaved('Canal atualizado.');
      } else {
        await api.connectChannel(input);
        onSaved(`${input.name.trim()} conectado. Falta confirmar o webhook no painel da Meta.`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <div className={s.formRow}>
        <Field label="Nome no console" hint="Só para a equipe identificar o número." className={s.grow}>
          {(id) => (
            <TextInput
              id={id}
              autoFocus
              maxLength={40}
              placeholder="Ex.: WhatsApp Comercial"
              value={input.name}
              onChange={(e) => set('name', e.target.value)}
            />
          )}
        </Field>
        <Field label="Número" hint="Com DDI e DDD." className={s.grow}>
          {(id) => (
            <TextInput
              id={id}
              inputMode="tel"
              placeholder="+55 11 90000-0000"
              value={input.address}
              onChange={(e) => set('address', e.target.value)}
            />
          )}
        </Field>
      </div>

      <div className={s.formRow}>
        <Field label="ID da conta (WABA)" className={s.grow}>
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              placeholder="100000000000000"
              value={input.wabaId}
              onChange={(e) => set('wabaId', e.target.value)}
            />
          )}
        </Field>
        <Field label="ID do número de telefone" className={s.grow}>
          {(id) => (
            <TextInput
              id={id}
              inputMode="numeric"
              placeholder="200000000000000"
              value={input.phoneNumberId}
              onChange={(e) => set('phoneNumberId', e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field
        label="Token permanente"
        hint={
          endpoint
            ? `Deixe em branco para manter o token atual (${endpoint.whatsapp?.tokenHint ?? 'salvo'}).`
            : 'Token do usuário do sistema, gerado no painel da Meta. É cifrado e não volta para esta tela.'
        }
      >
        {(id) => (
          <TextInput
            id={id}
            type="password"
            autoComplete="off"
            placeholder={endpoint ? 'Manter o token atual' : 'EAAG…'}
            value={input.accessToken}
            onChange={(e) => set('accessToken', e.target.value)}
          />
        )}
      </Field>

      <fieldset className={s.fieldset}>
        <legend className={dialogs.fieldLabel}>Filas que recebem deste número ({input.queueIds.length})</legend>
        <div className={s.checkGrid}>
          {queues.map((q) => {
            const checked = input.queueIds.includes(q.id);
            return (
              <label key={q.id} className={cx(s.checkCard, checked && s.checkCardOn)}>
                <input
                  type="checkbox"
                  className="visually-hidden"
                  checked={checked}
                  onChange={() => set('queueIds', toggle(input.queueIds, q.id))}
                />
                <span className={s[`dot-${q.color}`]} aria-hidden />
                <span className={s.checkText}>
                  <strong>{q.name}</strong>
                  <span>{q.isDefault ? 'Fila padrão' : `${q.memberIds.length} pessoa(s)`}</span>
                </span>
                <span className={cx(s.checkbox, checked && s.checkboxOn)} aria-hidden>
                  {checked && <Check />}
                </span>
              </label>
            );
          })}
        </div>
        {input.queueIds.length === 0 && (
          <p className={s.helper}>
            Sem fila, as conversas deste número ficam sem destino e vão para a fila padrão. Escolha ao menos uma.
          </p>
        )}
      </fieldset>

      {!endpoint && (
        <p className={s.helper}>
          Depois de salvar, o canal fica <strong>aguardando verificação</strong>: o console mostra a URL e o token do webhook para
          colar no painel da Meta.{' '}
          <a href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started" target="_blank" rel="noreferrer">
            Documentação da Cloud API <ExternalLink aria-hidden />
          </a>
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
          {saving ? 'Salvando…' : endpoint ? 'Salvar' : 'Conectar número'}
        </Button>
      </div>
    </form>
  );
}
