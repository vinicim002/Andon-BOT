import { useState, type FormEvent } from 'react';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { api } from '../../api';
import { Button } from '../../design-system/components';
import { Field, FormGrid, Select, TextArea, TextInput } from '../../design-system/forms';
import { Modal } from '../../design-system/Modal';
import { integrationAuth } from '../../domain/labels';
import type { Integration, IntegrationAuthKind, IntegrationInput, IntegrationOperation } from '../../domain/integration';
import s from './Settings.module.css';
import dialogs from '../inbox/dialogs.module.css';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration?: Integration;
  onSaved: (message: string) => void;
};

export function IntegrationDialog(props: Props) {
  return (
    <Modal
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={props.integration ? `Editar ${props.integration.name}` : 'Nova integração'}
      size="lg"
    >
      {props.open && <IntegrationForm {...props} />}
    </Modal>
  );
}

const authKinds: IntegrationAuthKind[] = ['none', 'bearer', 'api_key', 'basic'];

const emptyOperation = (): IntegrationOperation => ({ id: '', name: '', method: 'GET', path: '/' });

function IntegrationForm({ integration, onOpenChange, onSaved }: Props) {
  const [input, setInput] = useState<IntegrationInput>({
    name: integration?.name ?? '',
    description: integration?.description ?? '',
    baseUrl: integration?.baseUrl ?? 'https://',
    // O segredo começa vazio na edição: ele não desce do back-end.
    auth: {
      kind: integration?.auth.kind ?? 'none',
      headerName: integration?.auth.headerName ?? '',
      username: integration?.auth.username ?? '',
      secret: '',
    },
    headers: integration?.headers ?? [],
    operations: integration?.operations ?? [emptyOperation()],
    timeoutMs: integration?.timeoutMs ?? 5000,
    retry: integration?.retry ?? { attempts: 3, backoffSeconds: 10 },
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof IntegrationInput>(key: K, value: IntegrationInput[K]) => setInput((v) => ({ ...v, [key]: value }));
  const setAuth = (patch: Partial<IntegrationInput['auth']>) => setInput((v) => ({ ...v, auth: { ...v.auth, ...patch } }));
  const setOperation = (index: number, patch: Partial<IntegrationOperation>) =>
    setInput((v) => ({ ...v, operations: v.operations.map((o, i) => (i === index ? { ...o, ...patch } : o)) }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (integration) {
        await api.saveIntegration(integration.id, input);
        onSaved('Integração atualizada.');
      } else {
        const created = await api.createIntegration(input);
        onSaved(`${created.name} cadastrada com ${created.operations.length} operação(ões).`);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate style={{ display: 'contents' }}>
      <FormGrid>
        <Field label="Nome" hint="Como aparece para quem monta o workflow.">
          {(id) => (
            <TextInput id={id} autoFocus placeholder="Ex.: ERP — Pedidos" value={input.name} onChange={(e) => set('name', e.target.value)} />
          )}
        </Field>
        <Field label="URL base" hint="Sem barra no fim.">
          {(id) => <TextInput id={id} value={input.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} />}
        </Field>
      </FormGrid>

      <Field label="Para que serve">
        {(id) => (
          <TextInput
            id={id}
            placeholder="Consulta de pedidos para responder status ao cliente."
            value={input.description}
            onChange={(e) => set('description', e.target.value)}
          />
        )}
      </Field>

      <fieldset className={s.fieldset}>
        <legend className={dialogs.fieldLabel}>Autenticação</legend>
        <Select
          aria-label="Tipo de autenticação"
          value={input.auth.kind}
          onChange={(e) => setAuth({ kind: e.target.value as IntegrationAuthKind })}
        >
          {authKinds.map((kind) => (
            <option key={kind} value={kind}>
              {integrationAuth[kind].label}
            </option>
          ))}
        </Select>
        <p className={s.helper}>{integrationAuth[input.auth.kind].description}</p>

        {input.auth.kind === 'api_key' && (
          <Field label="Nome do cabeçalho">
            {(id) => (
              <TextInput id={id} placeholder="X-API-Key" value={input.auth.headerName} onChange={(e) => setAuth({ headerName: e.target.value })} />
            )}
          </Field>
        )}
        {input.auth.kind === 'basic' && (
          <Field label="Usuário">
            {(id) => <TextInput id={id} value={input.auth.username} onChange={(e) => setAuth({ username: e.target.value })} />}
          </Field>
        )}
        {input.auth.kind !== 'none' && (
          <Field
            label={input.auth.kind === 'basic' ? 'Senha' : 'Token'}
            hint={
              integration
                ? `Deixe em branco para manter o atual (${integration.auth.secretHint ?? 'salvo'}).`
                : 'Cifrado ao salvar; não volta para esta tela.'
            }
          >
            {(id) => (
              <TextInput
                id={id}
                type="password"
                autoComplete="off"
                placeholder={integration ? 'Manter o atual' : '••••••••'}
                value={input.auth.secret}
                onChange={(e) => setAuth({ secret: e.target.value })}
              />
            )}
          </Field>
        )}
      </fieldset>

      <fieldset className={s.fieldset}>
        <legend className={dialogs.fieldLabel}>Operações ({input.operations.length})</legend>
        <p className={s.helper}>
          Cada operação vira uma opção no passo “Consultar sistema” do workflow. Use {'{{variáveis}}'} no caminho e no corpo.
        </p>
        {input.operations.map((operation, index) => (
          <div key={index} className={s.operationRow}>
            <TextInput
              aria-label={`Nome da operação ${index + 1}`}
              placeholder="Consultar pedido por CPF"
              value={operation.name}
              onChange={(e) => setOperation(index, { name: e.target.value })}
            />
            <div className={s.operationCall}>
              <Select
                aria-label={`Método da operação ${index + 1}`}
                value={operation.method}
                onChange={(e) => setOperation(index, { method: e.target.value as 'GET' | 'POST' })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </Select>
              <TextInput
                aria-label={`Caminho da operação ${index + 1}`}
                placeholder="/pedidos?cpf={{contato.cpf}}"
                value={operation.path}
                onChange={(e) => setOperation(index, { path: e.target.value })}
              />
              <Button
                variant="ghost"
                iconOnlyLabel={`Remover operação ${index + 1}`}
                icon={<Trash2 />}
                disabled={input.operations.length === 1}
                onClick={() => set('operations', input.operations.filter((_, i) => i !== index))}
              />
            </div>
            {operation.method === 'POST' && (
              <TextArea
                aria-label={`Corpo da operação ${index + 1}`}
                rows={2}
                placeholder='{ "cliente": "{{contato.nome}}" }'
                value={operation.body ?? ''}
                onChange={(e) => setOperation(index, { body: e.target.value })}
              />
            )}
          </div>
        ))}
        <Button variant="secondary" icon={<Plus />} onClick={() => set('operations', [...input.operations, emptyOperation()])}>
          Adicionar operação
        </Button>
      </fieldset>

      <FormGrid>
        <Field label="Tempo limite (ms)" hint="Entre 500 e 60000.">
          {(id) => (
            <TextInput
              id={id}
              type="number"
              min={500}
              max={60000}
              step={500}
              value={input.timeoutMs}
              onChange={(e) => set('timeoutMs', Number(e.target.value))}
            />
          )}
        </Field>
        <Field label="Tentativas" hint="1 = não repete.">
          {(id) => (
            <TextInput
              id={id}
              type="number"
              min={1}
              max={5}
              value={input.retry.attempts}
              onChange={(e) => set('retry', { ...input.retry, attempts: Number(e.target.value) })}
            />
          )}
        </Field>
        <Field label="Espera entre tentativas (s)">
          {(id) => (
            <TextInput
              id={id}
              type="number"
              min={0}
              max={300}
              value={input.retry.backoffSeconds}
              onChange={(e) => set('retry', { ...input.retry, backoffSeconds: Number(e.target.value) })}
            />
          )}
        </Field>
      </FormGrid>

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
          {saving ? 'Salvando…' : integration ? 'Salvar' : 'Cadastrar integração'}
        </Button>
      </div>
    </form>
  );
}
