// "Servidor" em memória para a fase de descoberta. Aplica as mesmas regras que o back-end vai
// aplicar (protocolo gerado, eventos de auditoria, mensagens de sistema na conversa), para as
// telas serem desenhadas contra o comportamento real e não contra dados estáticos.
// Fica no sessionStorage da aba para sobreviver a recarregamentos durante demonstrações;
// fechar a aba volta aos dados iniciais. Não é persistência de verdade.
import type {
  Availability,
  ChannelEndpoint,
  ChannelEndpointInput,
  ChannelStatus,
  InviteInput,
  InviteResult,
  Permission,
  Role,
  RoleInput,
  User,
  Contact,
  ContactInput,
  Conversation,
  Id,
  Message,
  NewTicket,
  OperationalQueue,
  Organization,
  OrganizationInput,
  OrganizationRef,
  QueueInput,
  QuickReply,
  QuickReplyInput,
  Tag,
  TagColor,
  Ticket,
  TicketEvent,
  TransferTarget,
} from '../domain/types';
import type { AiAnswer, AiPolicy, KnowledgeSource, SourceInput } from '../domain/ai';
import type { AuditAction, AuditChange, AuditEntityType } from '../domain/audit';
import type { Integration, IntegrationAuth, IntegrationInput, IntegrationRun, IntegrationStatus } from '../domain/integration';
import type { Workflow, WorkflowDefinition, WorkflowTemplate } from '../domain/workflow';
import { validateWorkflow } from '../domain/workflowValidation';
import { templateDefinition, templateInfo } from '../domain/workflowTemplates';
import * as seed from './data';

// Versão no nome: mudou o formato dos dados, a aba descarta o estado antigo.
const STORAGE_KEY = 'andon-mock-db-v11';

const initial = {
  users: [...seed.users],
  roles: [...seed.roles],
  queues: [...seed.queues],
  endpoints: seed.endpoints,
  contacts: [...seed.contacts],
  organizations: [...seed.organizations],
  integrations: [...seed.integrations],
  integrationRuns: [...seed.integrationRuns],
  knowledgeSources: [...seed.knowledgeSources],
  auditEvents: [...seed.auditEvents],
  aiPolicy: seed.aiPolicy,
  tags: [...seed.tagCatalog],
  conversations: [...seed.conversations],
  messages: [...seed.messages],
  tickets: [...seed.tickets],
  ticketEvents: [...seed.ticketEvents],
  quickReplies: [...seed.quickReplies],
  workflows: [...seed.workflows],
};

function load(): typeof initial {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? { ...initial, ...JSON.parse(saved) } : initial;
  } catch {
    return initial;
  }
}

export const db = load();

export function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Sem armazenamento: o estado vale até recarregar.
  }
}

// Ator da sessão. O back-end tira isto do cookie de sessão; aqui a camada de API avisa quem
// entrou. Nenhuma mutação recebe o ator por parâmetro para registrar auditoria — se recebesse,
// o cliente poderia se passar por outra pessoa.
let currentActorId: Id | undefined;

export function setActor(userId?: Id) {
  currentActorId = userId;
}

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const userName = (userId?: Id) => db.users.find((u) => u.id === userId)?.name ?? 'Alguém';

// Registra na trilha. `label` é copiado agora de propósito: a entidade pode ser renomeada
// ou removida depois e o evento tem de continuar legível.
function audit(
  action: AuditAction,
  entityType: AuditEntityType,
  entityLabel: string,
  summary: string,
  extra?: { entityId?: Id; changes?: AuditChange[] },
) {
  db.auditEvents = [
    {
      id: id(),
      at: now(),
      actorUserId: currentActorId,
      action,
      entityType,
      entityId: extra?.entityId,
      entityLabel,
      summary,
      changes: extra?.changes ?? [],
    },
    ...db.auditEvents,
  ];
}

// Compara antes/depois e devolve só o que mudou, já em texto legível.
function diff(before: Record<string, unknown>, after: Record<string, unknown>, labels: Record<string, string>): AuditChange[] {
  const changes: AuditChange[] = [];
  for (const [key, label] of Object.entries(labels)) {
    const from = before[key];
    const to = after[key];
    const same = JSON.stringify(from ?? null) === JSON.stringify(to ?? null);
    if (!same) changes.push({ field: label, from: describe(from), to: describe(to) });
  }
  return changes;
}

function describe(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) return value.length === 0 ? 'nenhum' : `${value.length} item(ns)`;
  if (typeof value === 'boolean') return value ? 'sim' : 'não';
  return String(value);
}

class NotFound extends Error {}

function conversationById(conversationId: Id) {
  const conversation = db.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new NotFound('Conversa não encontrada.');
  return conversation;
}

function patchConversation(conversationId: Id, patch: Partial<Conversation>) {
  conversationById(conversationId);
  db.conversations = db.conversations.map((c) => (c.id === conversationId ? { ...c, ...patch } : c));
}

function systemMessage(conversationId: Id, body: string) {
  db.messages = [
    ...db.messages,
    { id: id(), conversationId, direction: 'internal', senderType: 'system', contentType: 'text', body, createdAt: now() },
  ];
}

// ---------- Conversas ----------

export function markRead(conversationId: Id) {
  patchConversation(conversationId, { unreadCount: 0 });
}

export function assign(conversationId: Id, actorId: Id) {
  const current = conversationById(conversationId).assigneeId;
  if (current && current !== actorId && !hasPermission(actorId, 'conversations.take_over')) {
    throw new Error(`Este atendimento está com ${userName(current)}. Peça a um supervisor para transferir.`);
  }
  patchConversation(conversationId, { assigneeId: actorId, status: 'in_progress', botPaused: true });
  systemMessage(conversationId, `${userName(actorId)} assumiu o atendimento`);
}

export function transfer(conversationId: Id, target: TransferTarget, note: string | undefined, actorId: Id) {
  if (target.kind === 'user') {
    patchConversation(conversationId, { assigneeId: target.userId, status: 'in_progress', botPaused: true });
    systemMessage(conversationId, `${userName(actorId)} transferiu para ${userName(target.userId)}`);
  } else {
    const queue = db.queues.find((q) => q.id === target.queueId);
    patchConversation(conversationId, { queueId: target.queueId, assigneeId: undefined, status: 'queued' });
    systemMessage(conversationId, `${userName(actorId)} devolveu para a fila ${queue?.name ?? ''}`.trim());
  }
  // O resumo vira nota interna: quem recebe lê o contexto sem precisar rolar a conversa.
  if (note?.trim()) sendMessage(conversationId, `Resumo da transferência: ${note.trim()}`, true, actorId);
  if (target.kind === 'queue') distribute(target.queueId);
}

// ---------- Distribuição (rodízio por disponibilidade) ----------

const ACTIVE: Conversation['status'][] = ['in_progress', 'waiting_customer', 'waiting_internal'];
const activeLoad = (userId: Id) => db.conversations.filter((c) => c.assigneeId === userId && ACTIVE.includes(c.status)).length;

// Em filas com rodízio, cada conversa esperando vai para o membro disponível com menos
// atendimentos ativos (empate: ordem alfabética). Sem ninguém disponível, continua na fila.
export function distribute(queueId: Id) {
  const queue = db.queues.find((q) => q.id === queueId);
  if (!queue || queue.routingPolicy !== 'round_robin') return 0;
  const waiting = db.conversations
    .filter((c) => c.queueId === queueId && c.status === 'queued' && !c.assigneeId)
    .sort((a, b) => a.lastMessage.at.localeCompare(b.lastMessage.at));
  let assigned = 0;
  for (const conversation of waiting) {
    const candidates = db.users
      .filter((u) => queue.memberIds.includes(u.id) && u.status === 'active' && u.availability === 'available')
      .sort((a, b) => activeLoad(a.id) - activeLoad(b.id) || a.name.localeCompare(b.name));
    if (candidates.length === 0) break;
    patchConversation(conversation.id, { assigneeId: candidates[0].id, status: 'in_progress', botPaused: true });
    systemMessage(conversation.id, `Distribuído automaticamente para ${candidates[0].name} (rodízio da fila ${queue.name})`);
    assigned++;
  }
  return assigned;
}

export function setAvailability(userId: Id, availability: Availability, pauseReason?: string) {
  db.users = db.users.map((u) =>
    u.id === userId ? { ...u, availability, pauseReason: availability === 'paused' ? pauseReason : undefined } : u,
  );
  // Ao ficar disponível, a pessoa puxa o que estava esperando nas filas dela.
  if (availability === 'available') {
    return db.queues.filter((q) => q.memberIds.includes(userId)).reduce((total, q) => total + distribute(q.id), 0);
  }
  return 0;
}

// ---------- Filas ----------

function validateQueue(input: QueueInput, ignoreId?: Id) {
  if (!input.name.trim()) throw new Error('Informe o nome da fila.');
  if (db.queues.some((q) => q.id !== ignoreId && q.name.toLowerCase() === input.name.trim().toLowerCase())) {
    throw new Error('Já existe uma fila com esse nome.');
  }
}

// Garante exatamente uma fila padrão.
function applyDefault(queueId: Id, isDefault: boolean) {
  if (isDefault) db.queues = db.queues.map((q) => ({ ...q, isDefault: q.id === queueId }));
}

export function createQueue(input: QueueInput): OperationalQueue {
  validateQueue(input);
  const queue: OperationalQueue = { ...input, name: input.name.trim(), id: id(), isDefault: false };
  db.queues = [...db.queues, queue];
  applyDefault(queue.id, input.isDefault);
  distribute(queue.id);
  return queue;
}

export function updateQueue(queueId: Id, input: QueueInput) {
  const current = db.queues.find((q) => q.id === queueId);
  if (!current) throw new NotFound('Fila não encontrada.');
  validateQueue(input, queueId);
  if (current.isDefault && !input.isDefault) throw new Error('Defina outra fila como padrão antes de desmarcar esta.');
  db.queues = db.queues.map((q) => (q.id === queueId ? { ...q, ...input, name: input.name.trim() } : q));
  applyDefault(queueId, input.isDefault);
  distribute(queueId);
}

// Conversas da fila excluída vão para a fila padrão; a padrão não pode ser excluída.
export function deleteQueue(queueId: Id) {
  const queue = db.queues.find((q) => q.id === queueId);
  if (!queue) throw new NotFound('Fila não encontrada.');
  if (queue.isDefault) throw new Error('A fila padrão não pode ser excluída. Defina outra como padrão antes.');
  const fallback = db.queues.find((q) => q.isDefault)!;
  const moved = db.conversations.filter((c) => c.queueId === queueId);
  db.conversations = db.conversations.map((c) => (c.queueId === queueId ? { ...c, queueId: fallback.id } : c));
  for (const c of moved) systemMessage(c.id, `Fila ${queue.name} excluída; conversa movida para ${fallback.name}`);
  db.queues = db.queues.filter((q) => q.id !== queueId);
  distribute(fallback.id);
  return moved.length;
}

// ---------- Canais ----------

// Só dígitos: o que a Meta aceita como identificador e o que vale comparar entre números.
const digits = (value: string) => value.replace(/\D/g, '');

function validateChannel(input: ChannelEndpointInput, ignoreId?: Id) {
  const name = input.name.trim();
  const address = input.address.trim();
  if (!name) throw new Error('Dê um nome para identificar este número no console.');
  if (digits(address).length < 10) throw new Error('Informe o número com DDI e DDD. Ex.: +55 11 90000-0000.');
  if (!/^\d{10,20}$/.test(input.wabaId.trim())) throw new Error('O ID da conta do WhatsApp Business (WABA) tem só dígitos.');
  if (!/^\d{10,20}$/.test(input.phoneNumberId.trim())) throw new Error('O ID do número de telefone tem só dígitos.');
  const clash = db.endpoints.find((e) => e.id !== ignoreId && digits(e.address) === digits(address));
  if (clash) throw new Error(`O número ${clash.address} já está conectado em ${clash.name}.`);
  const sameId = db.endpoints.find((e) => e.id !== ignoreId && e.whatsapp?.phoneNumberId === input.phoneNumberId.trim());
  if (sameId) throw new Error(`Este ID de número já está em uso em ${sameId.name}.`);
  return { name, address, wabaId: input.wabaId.trim(), phoneNumberId: input.phoneNumberId.trim() };
}

// Guarda apenas a dica do token, como o back-end fará: o valor cifrado não volta para a tela.
const tokenHint = (token: string) => `••••${token.trim().slice(-4)}`;

// As filas apontam para o endpoint (endpoint_queue), então vincular um canal é editar as filas.
function linkQueues(endpointId: Id, queueIds: Id[]) {
  db.queues = db.queues.map((q) => {
    const should = queueIds.includes(q.id);
    const has = q.endpointIds.includes(endpointId);
    if (should === has) return q;
    return { ...q, endpointIds: should ? [...q.endpointIds, endpointId] : q.endpointIds.filter((x) => x !== endpointId) };
  });
}

export function connectChannel(input: ChannelEndpointInput): ChannelEndpoint {
  const clean = validateChannel(input);
  if (input.accessToken.trim().length < 20) throw new Error('Cole o token permanente gerado no painel da Meta.');
  const endpointId = id();
  // Nasce "pending": só vira "connected" depois de a verificação do webhook passar.
  const endpoint: ChannelEndpoint = {
    id: endpointId,
    channelType: 'whatsapp',
    name: clean.name,
    address: clean.address,
    status: 'pending',
    whatsapp: {
      wabaId: clean.wabaId,
      phoneNumberId: clean.phoneNumberId,
      verifiedName: clean.name,
      tokenHint: tokenHint(input.accessToken),
      webhookUrl: `${seed.webhookHost}/webhooks/whatsapp/${endpointId}`,
      webhookVerifyToken: `verif-${endpointId.slice(0, 8)}`,
    },
  };
  db.endpoints = [...db.endpoints, endpoint];
  linkQueues(endpointId, input.queueIds);
  audit('created', 'channel', endpoint.name, `Conectou o número ${endpoint.address}`, { entityId: endpointId });
  return endpoint;
}

export function updateChannel(endpointId: Id, input: ChannelEndpointInput) {
  const current = db.endpoints.find((e) => e.id === endpointId);
  if (!current) throw new NotFound('Canal não encontrado.');
  const clean = validateChannel(input, endpointId);
  const token = input.accessToken.trim();
  // Token em branco significa "mantém o que já está salvo" — a tela nunca recebe o valor atual.
  if (token && token.length < 20) throw new Error('O token novo parece incompleto. Deixe em branco para manter o atual.');
  const changes = diff(
    { name: current.name, address: current.address, phoneNumberId: current.whatsapp?.phoneNumberId },
    { name: clean.name, address: clean.address, phoneNumberId: clean.phoneNumberId },
    { name: 'Nome', address: 'Número', phoneNumberId: 'ID do número' },
  );
  // Troca de token é registrada como fato, sem o valor: nem o segredo nem a dica antiga entram.
  if (token) changes.push({ field: 'Token', to: 'substituído' });
  db.endpoints = db.endpoints.map((e) =>
    e.id === endpointId
      ? {
          ...e,
          name: clean.name,
          address: clean.address,
          whatsapp: e.whatsapp && {
            ...e.whatsapp,
            wabaId: clean.wabaId,
            phoneNumberId: clean.phoneNumberId,
            tokenHint: token ? tokenHint(token) : e.whatsapp.tokenHint,
          },
        }
      : e,
  );
  linkQueues(endpointId, input.queueIds);
  audit('updated', 'channel', clean.name, 'Alterou a configuração do canal', { entityId: endpointId, changes });
}

// Verificação simulada: credencial completa passa, token encurtado falha. Com a Cloud API real,
// isto é uma chamada ao endpoint do número — e o resultado alimenta os mesmos campos.
export function testChannel(endpointId: Id): ChannelEndpoint {
  const endpoint = db.endpoints.find((e) => e.id === endpointId);
  if (!endpoint) throw new NotFound('Canal não encontrado.');
  if (!endpoint.whatsapp) throw new Error('Este canal não tem configuração da Cloud API.');
  const ok = endpoint.whatsapp.tokenHint.length > 4 && Boolean(endpoint.whatsapp.phoneNumberId);
  db.endpoints = db.endpoints.map((e) =>
    e.id === endpointId
      ? {
          ...e,
          status: ok ? 'connected' : 'error',
          whatsapp: e.whatsapp && {
            ...e.whatsapp,
            quality: ok ? (e.whatsapp.quality ?? 'green') : e.whatsapp.quality,
            tier: ok ? (e.whatsapp.tier ?? '250') : e.whatsapp.tier,
            lastCheckedAt: now(),
            lastError: ok ? undefined : 'A Meta não reconheceu o token informado.',
          },
        }
      : e,
  );
  return db.endpoints.find((e) => e.id === endpointId)!;
}

export function setChannelStatus(endpointId: Id, status: ChannelStatus) {
  const endpoint = db.endpoints.find((e) => e.id === endpointId);
  if (!endpoint) throw new NotFound('Canal não encontrado.');
  db.endpoints = db.endpoints.map((e) => (e.id === endpointId ? { ...e, status } : e));
  audit(status === 'disabled' ? 'disabled' : 'enabled', 'channel', endpoint.name, `${status === 'disabled' ? 'Desconectou' : 'Reconectou'} o canal`, {
    entityId: endpointId,
    changes: [{ field: 'Estado', from: endpoint.status, to: status }],
  });
}

// Conversas em andamento impedem a remoção: elas referenciam o endpoint e perderiam a origem.
export function deleteChannel(endpointId: Id) {
  const endpoint = db.endpoints.find((e) => e.id === endpointId);
  if (!endpoint) throw new NotFound('Canal não encontrado.');
  const open = db.conversations.filter((c) => c.endpoint.id === endpointId && c.status !== 'closed');
  if (open.length > 0) {
    throw new Error(`${open.length} conversa(s) em andamento usam este número. Desconecte-o em vez de remover.`);
  }
  linkQueues(endpointId, []);
  db.endpoints = db.endpoints.filter((e) => e.id !== endpointId);
  audit('deleted', 'channel', endpoint.name, `Removeu o canal ${endpoint.address}`, { entityId: endpointId });
}

// ---------- Integrações ----------

function validateIntegration(input: IntegrationInput, ignoreId?: Id) {
  const name = input.name.trim();
  const baseUrl = input.baseUrl.trim().replace(/\/$/, '');
  if (!name) throw new Error('Dê um nome para a integração.');
  if (!/^https?:\/\/\S+$/.test(baseUrl)) throw new Error('A URL base deve começar com http:// ou https://.');
  if (db.integrations.some((i) => i.id !== ignoreId && i.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Já existe uma integração chamada ${name}.`);
  }
  if (input.operations.length === 0) throw new Error('Cadastre ao menos uma operação — é o que o workflow escolhe.');
  for (const operation of input.operations) {
    if (!operation.name.trim()) throw new Error('Toda operação precisa de nome.');
    if (!operation.path.trim().startsWith('/')) throw new Error(`O caminho de “${operation.name}” deve começar com /.`);
  }
  if (input.auth.kind === 'api_key' && !input.auth.headerName?.trim()) {
    throw new Error('Informe o nome do cabeçalho que leva a chave.');
  }
  if (input.timeoutMs < 500 || input.timeoutMs > 60_000) throw new Error('O tempo limite deve ficar entre 500 ms e 60 s.');
  if (input.retry.attempts < 1 || input.retry.attempts > 5) throw new Error('As tentativas devem ficar entre 1 e 5.');
  return { name, baseUrl };
}

// Mesmo tratamento do token de canal: guarda só a dica, nunca o segredo.
const secretHint = (secret: string) => `••••${secret.trim().slice(-4)}`;

function buildAuth(input: IntegrationInput, current?: IntegrationAuth): IntegrationAuth {
  const secret = input.auth.secret?.trim();
  return {
    kind: input.auth.kind,
    headerName: input.auth.kind === 'api_key' ? input.auth.headerName?.trim() : undefined,
    username: input.auth.kind === 'basic' ? input.auth.username?.trim() : undefined,
    // Segredo em branco na edição significa "mantém o atual".
    secretHint: input.auth.kind === 'none' ? undefined : secret ? secretHint(secret) : current?.secretHint,
  };
}

export function createIntegration(input: IntegrationInput): Integration {
  const clean = validateIntegration(input);
  if (input.auth.kind !== 'none' && !input.auth.secret?.trim()) throw new Error('Informe a credencial desta integração.');
  const integration: Integration = {
    id: id(),
    name: clean.name,
    description: input.description.trim(),
    baseUrl: clean.baseUrl,
    auth: buildAuth(input),
    headers: input.headers.filter((h) => h.name.trim()),
    operations: input.operations.map((o) => ({ ...o, id: o.id || id(), name: o.name.trim(), path: o.path.trim() })),
    timeoutMs: input.timeoutMs,
    retry: input.retry,
    status: 'active',
    createdAt: now(),
  };
  db.integrations = [...db.integrations, integration];
  audit('created', 'integration', integration.name, `Cadastrou a integração com ${integration.operations.length} operação(ões)`, {
    entityId: integration.id,
  });
  return integration;
}

export function updateIntegration(integrationId: Id, input: IntegrationInput) {
  const current = db.integrations.find((i) => i.id === integrationId);
  if (!current) throw new NotFound('Integração não encontrada.');
  const clean = validateIntegration(input, integrationId);
  // Remover uma operação usada por workflow deixaria o nó apontando para o vazio.
  const removed = current.operations.filter((o) => !input.operations.some((kept) => kept.id === o.id));
  for (const operation of removed) {
    const used = workflowsUsingOperation(integrationId, operation.id);
    if (used.length > 0) throw new Error(`A operação “${operation.name}” é usada em ${used.join(', ')}. Ajuste o workflow antes.`);
  }
  const updated: Integration = {
    ...current,
    name: clean.name,
    description: input.description.trim(),
    baseUrl: clean.baseUrl,
    auth: buildAuth(input, current.auth),
    headers: input.headers.filter((h) => h.name.trim()),
    operations: input.operations.map((o) => ({ ...o, id: o.id || id(), name: o.name.trim(), path: o.path.trim() })),
    timeoutMs: input.timeoutMs,
    retry: input.retry,
  };
  db.integrations = db.integrations.map((i) => (i.id === integrationId ? updated : i));
  const changes = diff(
    { name: current.name, baseUrl: current.baseUrl, auth: current.auth.kind, operations: current.operations, timeoutMs: current.timeoutMs },
    { name: updated.name, baseUrl: updated.baseUrl, auth: updated.auth.kind, operations: updated.operations, timeoutMs: updated.timeoutMs },
    { name: 'Nome', baseUrl: 'URL base', auth: 'Autenticação', operations: 'Operações', timeoutMs: 'Tempo limite' },
  );
  if (input.auth.secret?.trim()) changes.push({ field: 'Credencial', to: 'substituída' });
  audit('updated', 'integration', updated.name, 'Alterou a integração', { entityId: integrationId, changes });
  return updated;
}

export function setIntegrationStatus(integrationId: Id, status: IntegrationStatus) {
  const integration = db.integrations.find((i) => i.id === integrationId);
  if (!integration) throw new NotFound('Integração não encontrada.');
  db.integrations = db.integrations.map((i) => (i.id === integrationId ? { ...i, status } : i));
  audit(status === 'disabled' ? 'disabled' : 'enabled', 'integration', integration.name, `${status === 'disabled' ? 'Desativou' : 'Reativou'} a integração`, {
    entityId: integrationId,
    changes: [{ field: 'Estado', from: integration.status, to: status }],
  });
}

// Nomes dos workflows (rascunho ou versão publicada) que apontam para esta operação.
function workflowsUsingOperation(integrationId: Id, operationId: Id) {
  const uses = (definition: WorkflowDefinition) =>
    definition.nodes.some((n) => {
      if (n.type !== 'http_request') return false;
      const c = n.config as { integrationId?: Id; operationId?: Id };
      return c.integrationId === integrationId && c.operationId === operationId;
    });
  return db.workflows.filter((w) => uses(w.draft) || w.versions.some((v) => uses(v.definition))).map((w) => w.name);
}

export function workflowsUsingIntegration(integrationId: Id) {
  const uses = (definition: WorkflowDefinition) =>
    definition.nodes.some((n) => n.type === 'http_request' && (n.config as { integrationId?: Id }).integrationId === integrationId);
  return db.workflows.filter((w) => uses(w.draft) || w.versions.some((v) => uses(v.definition))).map((w) => w.name);
}

export function deleteIntegration(integrationId: Id) {
  const integration = db.integrations.find((i) => i.id === integrationId);
  if (!integration) throw new NotFound('Integração não encontrada.');
  const used = workflowsUsingIntegration(integrationId);
  if (used.length > 0) throw new Error(`Usada em ${used.join(', ')}. Remova o passo do workflow antes, ou apenas desative.`);
  db.integrations = db.integrations.filter((i) => i.id !== integrationId);
  db.integrationRuns = db.integrationRuns.filter((r) => r.integrationId !== integrationId);
  audit('deleted', 'integration', integration.name, 'Removeu a integração e os logs dela', { entityId: integrationId });
}

// Chamada de teste simulada. Registra a execução como qualquer outra, para a tela de logs
// mostrar o teste junto do que o workflow fez — é assim que se depura uma integração.
export function testIntegration(integrationId: Id, operationId: Id): IntegrationRun {
  const integration = db.integrations.find((i) => i.id === integrationId);
  if (!integration) throw new NotFound('Integração não encontrada.');
  const operation = integration.operations.find((o) => o.id === operationId);
  if (!operation) throw new NotFound('Operação não encontrada.');

  const disabled = integration.status === 'disabled';
  // Sem credencial onde ela é exigida, a chamada falha com 401 — como falharia de verdade.
  const missingSecret = integration.auth.kind !== 'none' && !integration.auth.secretHint;
  const failed = disabled || missingSecret;

  const run: IntegrationRun = {
    id: id(),
    integrationId,
    operationName: operation.name,
    method: operation.method,
    url: `${integration.baseUrl}${operation.path}`,
    status: failed ? 'failed' : 'success',
    httpStatus: disabled ? undefined : missingSecret ? 401 : 200,
    durationMs: failed ? integration.timeoutMs : 250 + Math.floor(Math.random() * 600),
    attempts: failed ? integration.retry.attempts : 1,
    error: disabled
      ? 'Integração desativada: a chamada não foi enviada.'
      : missingSecret
        ? 'Credencial ausente ou recusada (401).'
        : undefined,
    source: { kind: 'manual' },
    at: now(),
  };
  db.integrationRuns = [run, ...db.integrationRuns];
  audit('tested', 'integration', integration.name, `Testou “${operation.name}”: ${run.status === 'success' ? 'sucesso' : 'falha'}`, {
    entityId: integrationId,
  });
  return run;
}

// ---------- Base de conhecimento e IA ----------

// Quantos fragmentos uma fonte gera. No back-end isso sai do indexador; aqui é derivado do
// tamanho, só para a tela mostrar número coerente.
function estimateChunks(source: SourceInput) {
  if (source.kind === 'text') return Math.max(1, Math.ceil((source.content ?? '').length / 400));
  return source.kind === 'pdf' ? 20 + Math.floor(Math.random() * 30) : 30 + Math.floor(Math.random() * 40);
}

function validateSource(input: SourceInput, ignoreId?: Id) {
  const name = input.name.trim();
  if (!name) throw new Error('Dê um nome para a fonte — é ele que aparece na citação.');
  if (db.knowledgeSources.some((s) => s.id !== ignoreId && s.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Já existe uma fonte chamada ${name}.`);
  }
  if (input.kind === 'url' && !/^https?:\/\/\S+$/.test(input.origin?.trim() ?? '')) {
    throw new Error('Informe o endereço da página, começando com http:// ou https://.');
  }
  if (input.kind === 'pdf' && !input.origin?.trim()) throw new Error('Informe o nome do arquivo PDF.');
  if (input.kind === 'text' && (input.content?.trim().length ?? 0) < 40) {
    throw new Error('Escreva pelo menos algumas frases — texto curto não sustenta citação.');
  }
  return { name, origin: input.origin?.trim() || undefined, content: input.content?.trim() || undefined };
}

export function createSource(input: SourceInput): KnowledgeSource {
  const clean = validateSource(input);
  // Nasce 'indexing': só pode ser citada depois de indexada, como no back-end.
  const source: KnowledgeSource = {
    id: id(),
    name: clean.name,
    kind: input.kind,
    origin: clean.origin,
    content: clean.content,
    status: 'indexing',
    chunks: 0,
    createdAt: now(),
  };
  db.knowledgeSources = [...db.knowledgeSources, source];
  audit('created', 'knowledge_source', source.name, `Cadastrou fonte do tipo ${source.kind}`, { entityId: source.id });
  return source;
}

export function reindexSource(sourceId: Id): KnowledgeSource {
  const source = db.knowledgeSources.find((s) => s.id === sourceId);
  if (!source) throw new NotFound('Fonte não encontrada.');
  // Reindexação simulada: a fonte que já falhou por 403 continua falhando, porque a causa
  // (exigir login) não mudou. As outras concluem.
  const stillBlocked = source.status === 'error' && source.origin?.includes('intranet');
  const updated: KnowledgeSource = stillBlocked
    ? { ...source, status: 'error', chunks: 0, error: source.error }
    : {
        ...source,
        status: 'indexed',
        chunks: estimateChunks({ name: source.name, kind: source.kind, origin: source.origin, content: source.content }),
        lastIndexedAt: now(),
        error: undefined,
      };
  db.knowledgeSources = db.knowledgeSources.map((s) => (s.id === sourceId ? updated : s));
  audit('reindexed', 'knowledge_source', source.name, updated.status === 'indexed' ? 'Reindexou a fonte' : 'Reindexação falhou', {
    entityId: sourceId,
    changes: diff({ chunks: source.chunks }, { chunks: updated.chunks }, { chunks: 'Fragmentos' }),
  });
  return updated;
}

export function updateSource(sourceId: Id, input: SourceInput) {
  const current = db.knowledgeSources.find((s) => s.id === sourceId);
  if (!current) throw new NotFound('Fonte não encontrada.');
  const clean = validateSource(input, sourceId);
  // Mudou o conteúdo: volta para 'indexing', senão a citação apontaria para o texto antigo.
  const changed = clean.content !== current.content || clean.origin !== current.origin;
  db.knowledgeSources = db.knowledgeSources.map((s) =>
    s.id === sourceId
      ? { ...s, name: clean.name, kind: input.kind, origin: clean.origin, content: clean.content, status: changed ? 'indexing' : s.status, chunks: changed ? 0 : s.chunks }
      : s,
  );
}

// Nomes dos workflows cujo nó de IA cita esta fonte.
export function workflowsUsingSource(sourceId: Id) {
  const uses = (definition: WorkflowDefinition) =>
    definition.nodes.some((n) => n.type === 'ai_answer' && ((n.config as { sourceIds?: Id[] }).sourceIds ?? []).includes(sourceId));
  return db.workflows.filter((w) => uses(w.draft) || w.versions.some((v) => uses(v.definition))).map((w) => w.name);
}

export function deleteSource(sourceId: Id) {
  const source = db.knowledgeSources.find((s) => s.id === sourceId);
  if (!source) throw new NotFound('Fonte não encontrada.');
  const used = workflowsUsingSource(sourceId);
  if (used.length > 0) throw new Error(`Citada em ${used.join(', ')}. Tire a fonte do passo de IA antes de remover.`);
  db.knowledgeSources = db.knowledgeSources.filter((s) => s.id !== sourceId);
  // A política também aponta para fontes: limpa a referência para não sobrar id órfão.
  db.aiPolicy = { ...db.aiPolicy, sourceIds: db.aiPolicy.sourceIds.filter((id) => id !== sourceId) };
  audit('deleted', 'knowledge_source', source.name, `Removeu a fonte e ${source.chunks} fragmento(s)`, { entityId: sourceId });
}

export function saveAiPolicy(policy: AiPolicy): AiPolicy {
  if (policy.maxRepliesBeforeHandoff < 1 || policy.maxRepliesBeforeHandoff > 10) {
    throw new Error('O limite de respostas antes do handoff deve ficar entre 1 e 10.');
  }
  if (policy.autonomy !== 'off' && !policy.handoffQueueId) {
    throw new Error('Escolha a fila que recebe o atendimento quando a IA entregar para uma pessoa.');
  }
  const indexed = db.knowledgeSources.filter((s) => s.status === 'indexed').map((s) => s.id);
  const notIndexed = policy.sourceIds.filter((id) => !indexed.includes(id));
  if (notIndexed.length > 0) {
    const names = db.knowledgeSources.filter((s) => notIndexed.includes(s.id)).map((s) => s.name);
    throw new Error(`Estas fontes ainda não estão indexadas: ${names.join(', ')}.`);
  }
  if (policy.autonomy !== 'off' && policy.requireCitation && policy.sourceIds.length === 0) {
    throw new Error('Com citação obrigatória, escolha ao menos uma fonte — senão a IA nunca poderá responder.');
  }
  const before = db.aiPolicy;
  db.aiPolicy = { ...policy, blockedTopics: policy.blockedTopics.map((t) => t.trim()).filter(Boolean) };
  audit('updated', 'ai_policy', 'Política da IA', 'Alterou a política da IA', {
    changes: diff(
      { ...before } as unknown as Record<string, unknown>,
      { ...db.aiPolicy } as unknown as Record<string, unknown>,
      {
        autonomy: 'Autonomia',
        requireCitation: 'Exigir citação',
        maxRepliesBeforeHandoff: 'Respostas antes do handoff',
        handoffQueueId: 'Fila do handoff',
        sourceIds: 'Fontes permitidas',
        blockedTopics: 'Assuntos bloqueados',
      },
    ),
  });
  return db.aiPolicy;
}

// Resposta simulada: recupera o fragmento por palavra-chave e devolve a citação. Mostra as
// três decisões que importam — assunto bloqueado, sem fonte que sustente, e resposta com citação.
export function askAi(question: string): AiAnswer {
  const policy = db.aiPolicy;
  const text = question.trim();
  if (!text) throw new Error('Escreva a pergunta.');

  const base = { question: text, tokens: 180 + Math.floor(Math.random() * 400), latencyMs: 600 + Math.floor(Math.random() * 900), at: now() };

  if (policy.autonomy === 'off') {
    return { ...base, text: '', citations: [], handoffReason: 'A IA está desligada nesta empresa.' };
  }

  const lower = text.toLowerCase();
  const blocked = policy.blockedTopics.find((topic) => lower.includes(topic.toLowerCase().split(' ')[0]));
  if (blocked) {
    return { ...base, text: '', citations: [], handoffReason: `Assunto bloqueado (“${blocked}”): entregue direto para uma pessoa.` };
  }

  const allowed = db.knowledgeSources.filter(
    (s) => s.status === 'indexed' && (policy.sourceIds.length === 0 || policy.sourceIds.includes(s.id)),
  );
  const words = lower.split(/\W+/).filter((w) => w.length > 3);
  const hit = allowed.find((s) => words.some((w) => s.name.toLowerCase().includes(w) || (s.content ?? '').toLowerCase().includes(w)));

  if (!hit) {
    return {
      ...base,
      text: '',
      citations: [],
      handoffReason: policy.requireCitation
        ? 'Nenhuma fonte indexada sustenta a resposta e a citação é obrigatória.'
        : 'Nenhuma fonte indexada sustenta a resposta.',
    };
  }

  const snippet = (hit.content ?? `Trecho indexado de ${hit.origin ?? hit.name}`).slice(0, 180);
  return {
    ...base,
    text:
      policy.autonomy === 'suggest'
        ? `Sugestão para o atendente: com base em “${hit.name}”, ${snippet}`
        : `Com base em ${hit.name}: ${snippet}`,
    citations: [{ sourceId: hit.id, sourceName: hit.name, snippet }],
  };
}

// ---------- Respostas rápidas ----------

function normalizeShortcut(shortcut: string) {
  return shortcut.trim().replace(/^\//, '').toLowerCase();
}

function validateQuickReply(input: QuickReplyInput, ignoreId?: Id) {
  const shortcut = normalizeShortcut(input.shortcut);
  if (!/^[a-z0-9-]{2,24}$/.test(shortcut)) throw new Error('O atalho deve ter de 2 a 24 letras, números ou hífen, sem espaços.');
  if (!input.title.trim()) throw new Error('Informe o título.');
  if (!input.body.trim()) throw new Error('Escreva o texto da resposta.');
  if (db.quickReplies.some((r) => r.id !== ignoreId && r.shortcut === shortcut)) throw new Error(`O atalho /${shortcut} já existe.`);
  return { shortcut, title: input.title.trim(), body: input.body.trim() };
}

export function createQuickReply(input: QuickReplyInput): QuickReply {
  const reply = { ...validateQuickReply(input), id: id() };
  db.quickReplies = [...db.quickReplies, reply];
  return reply;
}

export function updateQuickReply(replyId: Id, input: QuickReplyInput) {
  const clean = validateQuickReply(input, replyId);
  db.quickReplies = db.quickReplies.map((r) => (r.id === replyId ? { ...r, ...clean } : r));
}

export function deleteQuickReply(replyId: Id) {
  db.quickReplies = db.quickReplies.filter((r) => r.id !== replyId);
}

export function setBotPaused(conversationId: Id, paused: boolean, actorId: Id) {
  patchConversation(conversationId, { botPaused: paused });
  systemMessage(conversationId, `${userName(actorId)} ${paused ? 'pausou' : 'retomou'} o bot`);
}

export function resolve(conversationId: Id, actorId: Id) {
  patchConversation(conversationId, { status: 'resolved' });
  systemMessage(conversationId, `${userName(actorId)} resolveu o atendimento`);
}

export function reopen(conversationId: Id, actorId: Id) {
  patchConversation(conversationId, { status: 'in_progress', assigneeId: actorId });
  systemMessage(conversationId, `${userName(actorId)} reabriu o atendimento`);
}

export function sendMessage(conversationId: Id, body: string, internal: boolean, actorId: Id): Message {
  const message: Message = {
    id: id(),
    conversationId,
    direction: internal ? 'internal' : 'outbound',
    senderType: 'user',
    senderUserId: actorId,
    contentType: 'text',
    body,
    deliveryStatus: internal ? undefined : 'sent',
    createdAt: now(),
  };
  db.messages = [...db.messages, message];
  if (!internal) {
    patchConversation(conversationId, {
      lastMessage: { preview: body, contentType: 'text', direction: 'outbound', deliveryStatus: 'sent', at: message.createdAt },
    });
  }
  return message;
}

export function setConversationTags(conversationId: Id, tags: Tag[]) {
  patchConversation(conversationId, { tags });
}

// ---------- Contatos e etiquetas ----------

export function updateContact(contactId: Id, patch: Partial<Contact>) {
  const current = db.contacts.find((c) => c.id === contactId);
  if (!current) throw new NotFound('Contato não encontrado.');
  const updated = { ...current, ...patch };
  db.contacts = db.contacts.map((c) => (c.id === contactId ? updated : c));
  // A conversa carrega uma cópia do contato (como a API vai devolver), então é atualizada junto.
  db.conversations = db.conversations.map((c) => (c.contact.id === contactId ? { ...c, contact: updated } : c));
  return updated;
}

// ---------- Contatos e organizações ----------

const onlyDigits = (value: string) => value.replace(/\D/g, '');

// Código curto sequencial, como o back-end fará: a pessoa dita "mil cento e dez", não um UUID.
function nextContactCode() {
  const highest = db.contacts.reduce((max, c) => Math.max(max, Number(c.code) || 0), 1000100);
  return String(highest + 1);
}

export function createOrganization(input: OrganizationInput): Organization {
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome da organização.');
  const existing = db.organizations.find((o) => o.name.toLowerCase() === name.toLowerCase());
  if (existing) return existing;
  const organization: Organization = {
    id: id(),
    name,
    cnpj: input.cnpj?.trim() || undefined,
    domain: input.domain?.trim().toLowerCase() || undefined,
    notes: input.notes?.trim() || undefined,
    createdAt: now(),
  };
  db.organizations = [...db.organizations, organization];
  return organization;
}

export function updateOrganization(organizationId: Id, input: OrganizationInput) {
  const current = db.organizations.find((o) => o.id === organizationId);
  if (!current) throw new NotFound('Organização não encontrada.');
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome da organização.');
  const updated: Organization = {
    ...current,
    name,
    cnpj: input.cnpj?.trim() || undefined,
    domain: input.domain?.trim().toLowerCase() || undefined,
    notes: input.notes?.trim() || undefined,
  };
  db.organizations = db.organizations.map((o) => (o.id === organizationId ? updated : o));
  // O nome está embutido em cada contato (e na cópia dentro da conversa): propaga a renomeação.
  const ref: OrganizationRef = { id: updated.id, name: updated.name };
  db.contacts = db.contacts.map((c) => (c.organization?.id === organizationId ? { ...c, organization: ref } : c));
  db.conversations = db.conversations.map((c) =>
    c.contact.organization?.id === organizationId ? { ...c, contact: { ...c.contact, organization: ref } } : c,
  );
  return updated;
}

// Organização com contatos não é removida: eles ficariam apontando para o vazio.
export function deleteOrganization(organizationId: Id) {
  const organization = db.organizations.find((o) => o.id === organizationId);
  if (!organization) throw new NotFound('Organização não encontrada.');
  const linked = db.contacts.filter((c) => c.organization?.id === organizationId).length;
  if (linked > 0) throw new Error(`${linked} contato(s) pertencem a ${organization.name}. Troque a empresa deles antes de remover.`);
  db.organizations = db.organizations.filter((o) => o.id !== organizationId);
}

// Resolve a empresa do formulário: id existente, nome novo (cria), ou nenhuma.
function resolveOrganization(input: ContactInput): OrganizationRef | undefined {
  const fresh = input.newOrganizationName?.trim();
  if (fresh) {
    const created = createOrganization({ name: fresh });
    return { id: created.id, name: created.name };
  }
  if (!input.organizationId) return undefined;
  const found = db.organizations.find((o) => o.id === input.organizationId);
  if (!found) throw new NotFound('Organização não encontrada.');
  return { id: found.id, name: found.name };
}

function validateContact(input: ContactInput, ignoreId?: Id) {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name) throw new Error('Informe o nome do contato.');
  if (onlyDigits(phone).length < 10) throw new Error('Informe o telefone com DDD. Ex.: +55 11 90000-0000.');
  if (input.email?.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) throw new Error('E-mail inválido.');
  // Telefone é a chave natural do contato (no banco, UNIQUE (tenant_id, phone)).
  const clash = db.contacts.find((c) => c.id !== ignoreId && onlyDigits(c.phone) === onlyDigits(phone));
  if (clash) throw new Error(`O telefone ${clash.phone} já é do contato ${clash.name} (${clash.code}).`);
  return { name, phone };
}

export function createContact(input: ContactInput): Contact {
  const clean = validateContact(input);
  const contact: Contact = {
    id: id(),
    code: nextContactCode(),
    name: clean.name,
    phone: clean.phone,
    email: input.email?.trim() || undefined,
    jobTitle: input.jobTitle?.trim() || undefined,
    organization: resolveOrganization(input),
    cpf: input.cpf?.trim() || undefined,
    cnpj: input.cnpj?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    tags: [],
    createdAt: now(),
  };
  db.contacts = [...db.contacts, contact];
  return contact;
}

export function saveContact(contactId: Id, input: ContactInput): Contact {
  const current = db.contacts.find((c) => c.id === contactId);
  if (!current) throw new NotFound('Contato não encontrado.');
  const clean = validateContact(input, contactId);
  return updateContact(contactId, {
    name: clean.name,
    phone: clean.phone,
    email: input.email?.trim() || undefined,
    jobTitle: input.jobTitle?.trim() || undefined,
    organization: resolveOrganization(input),
    cpf: input.cpf?.trim() || undefined,
    cnpj: input.cnpj?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
  });
}

export function setContactTags(contactId: Id, tags: Tag[]) {
  return updateContact(contactId, { tags });
}

// Contato com conversa ou ticket não é removido: perderia o histórico que aponta para ele.
export function deleteContact(contactId: Id) {
  const contact = db.contacts.find((c) => c.id === contactId);
  if (!contact) throw new NotFound('Contato não encontrado.');
  const conversations = db.conversations.filter((c) => c.contact.id === contactId).length;
  const tickets = db.tickets.filter((t) => t.contactId === contactId).length;
  if (conversations > 0 || tickets > 0) {
    const parts = [conversations && `${conversations} conversa(s)`, tickets && `${tickets} ticket(s)`].filter(Boolean);
    throw new Error(`Este contato tem ${parts.join(' e ')}. O histórico impede a remoção.`);
  }
  db.contacts = db.contacts.filter((c) => c.id !== contactId);
}

export function createTag(name: string, color: TagColor): Tag {
  const existing = db.tags.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing;
  const tag: Tag = { id: id(), name: name.trim(), color };
  db.tags = [...db.tags, tag];
  return tag;
}

// ---------- Tickets ----------

// Protocolo: AAAAMMDD + sequencial do dia com 5 dígitos. Gerado uma vez e nunca alterado.
function nextProtocol() {
  const d = new Date();
  const prefix = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const today = db.tickets.filter((t) => t.protocol.startsWith(prefix)).map((t) => Number(t.protocol.slice(8)));
  return prefix + String((today.length ? Math.max(...today) : 0) + 1).padStart(5, '0');
}

function ticketEvent(event: Omit<TicketEvent, 'id' | 'createdAt'>) {
  db.ticketEvents = [...db.ticketEvents, { ...event, id: id(), createdAt: now() }];
}

export function createTicket(input: NewTicket, actorId: Id): Ticket {
  if (input.conversationId && conversationById(input.conversationId).ticketId) {
    throw new Error('Esta conversa já tem um ticket aberto.');
  }
  const ticket: Ticket = { ...input, id: id(), protocol: nextProtocol(), status: 'open', createdAt: now(), updatedAt: now() };
  db.tickets = [...db.tickets, ticket];
  ticketEvent({ ticketId: ticket.id, type: 'created', actorUserId: actorId });
  if (input.conversationId) {
    patchConversation(input.conversationId, { ticketId: ticket.id });
    systemMessage(input.conversationId, `${userName(actorId)} abriu o ticket #${ticket.protocol}`);
  }
  return ticket;
}

type TicketPatch = Partial<Pick<Ticket, 'status' | 'priority' | 'assigneeId'>>;

export function updateTicket(ticketId: Id, patch: TicketPatch, actorId: Id) {
  const current = db.tickets.find((t) => t.id === ticketId);
  if (!current) throw new NotFound('Ticket não encontrado.');
  if (patch.status && patch.status !== current.status) {
    ticketEvent({ ticketId, type: 'status_changed', actorUserId: actorId, from: current.status, to: patch.status });
  }
  if (patch.priority && patch.priority !== current.priority) {
    ticketEvent({ ticketId, type: 'priority_changed', actorUserId: actorId, from: current.priority, to: patch.priority });
  }
  if ('assigneeId' in patch && patch.assigneeId !== current.assigneeId) {
    ticketEvent({ ticketId, type: 'assigned', actorUserId: actorId, from: current.assigneeId, to: patch.assigneeId });
  }
  const updated = { ...current, ...patch, updatedAt: now() };
  db.tickets = db.tickets.map((t) => (t.id === ticketId ? updated : t));
  return updated;
}

export function commentTicket(ticketId: Id, body: string, actorId: Id) {
  ticketEvent({ ticketId, type: 'comment', actorUserId: actorId, body });
  db.tickets = db.tickets.map((t) => (t.id === ticketId ? { ...t, updatedAt: now() } : t));
}

// ---------- Acesso: login, usuários, convites e papéis ----------

export class AccessError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const DAY = 24 * 60 * 60 * 1000;

function hasPermission(userId: Id, permission: Permission) {
  const user = db.users.find((u) => u.id === userId);
  return Boolean(db.roles.find((r) => r.id === user?.roleId)?.permissions.includes(permission));
}

// "maria.silva@x.com" → "Maria Silva": nome provisório até a pessoa confirmar na ativação.
function nameFromEmail(email: string) {
  return email
    .split('@')[0]
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

// Mock do envio: com a API real, o back-end manda o e-mail (fila durável, com retentativa).
const freshInvite = (actorId: Id) => ({
  token: inviteToken(),
  expiresAt: new Date(Date.now() + 7 * DAY).toISOString(),
  invitedBy: actorId,
  sentAt: now(),
});
const inviteToken = () => crypto.randomUUID().replace(/-/g, '');
const isAdmin = (u: User) => db.roles.find((r) => r.id === u.roleId)?.system === true;
const activeAdmins = () => db.users.filter((u) => u.status === 'active' && isAdmin(u));

function userById(userId: Id) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new NotFound('Usuário não encontrado.');
  return user;
}

function patchUser(userId: Id, patch: Partial<User>) {
  db.users = db.users.map((u) => (u.id === userId ? { ...u, ...patch } : u));
}

function setMemberships(userId: Id, queueIds: Id[]) {
  db.queues = db.queues.map((q) => {
    const member = q.memberIds.includes(userId);
    const wanted = queueIds.includes(q.id);
    if (member === wanted) return q;
    return { ...q, memberIds: wanted ? [...q.memberIds, userId] : q.memberIds.filter((id) => id !== userId) };
  });
}

// Mock: qualquer senha com 4+ caracteres vale. A mensagem de erro é a mesma para e-mail
// inexistente e senha errada, de propósito (não revela quem tem conta).
export function authenticate(email: string, password: string): User {
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || password.length < 4) throw new AccessError('Usuário ou senha incorretos.', 401);
  if (user.status === 'disabled') throw new AccessError('Seu acesso foi desativado. Fale com o administrador da empresa.', 403);
  if (user.status === 'invited') throw new AccessError('Ative seu acesso pelo link do convite que você recebeu.', 403);
  patchUser(user.id, { lastSeenAt: now() });
  return userById(user.id);
}

export function invite(input: InviteInput, actorId: Id): InviteResult {
  if (!db.roles.some((r) => r.id === input.roleId)) throw new Error('Escolha um papel.');
  const result: InviteResult = { invited: [], skipped: [] };
  const seen = new Set<string>();
  for (const raw of input.emails) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      result.skipped.push({ email, reason: 'e-mail inválido' });
      continue;
    }
    const existing = db.users.find((u) => u.email.toLowerCase() === email);
    if (existing) {
      result.skipped.push({ email, reason: existing.status === 'invited' ? 'já tem convite pendente' : 'já tem acesso' });
      continue;
    }
    const user: User = {
      id: id(),
      name: nameFromEmail(email),
      email,
      roleId: input.roleId,
      status: 'invited',
      availability: 'offline',
      invite: freshInvite(actorId),
    };
    db.users = [...db.users, user];
    setMemberships(user.id, input.queueIds);
    result.invited.push(user);
  }
  if (result.invited.length === 0 && result.skipped.length === 0) throw new Error('Informe pelo menos um e-mail.');
  return result;
}

// Reenvia o e-mail com um link novo (o anterior deixa de valer) e renova a validade — inclusive de convite expirado.
export function resendInvite(userId: Id, actorId: Id) {
  const user = userById(userId);
  if (user.status !== 'invited') throw new Error('Este usuário já ativou o acesso.');
  patchUser(userId, { invite: freshInvite(actorId) });
  return userById(userId);
}

export function revokeInvite(userId: Id) {
  const user = userById(userId);
  if (user.status !== 'invited') throw new Error('Só convites pendentes podem ser revogados.');
  setMemberships(userId, []);
  db.users = db.users.filter((u) => u.id !== userId);
}

export function findInvite(token: string) {
  const user = db.users.find((u) => u.status === 'invited' && u.invite?.token === token);
  if (!user?.invite) return undefined;
  return { name: user.name, email: user.email, expired: new Date(user.invite.expiresAt).getTime() < Date.now() };
}

export function acceptInvite(token: string, name: string, password: string): User {
  const user = db.users.find((u) => u.status === 'invited' && u.invite?.token === token);
  if (!user?.invite) throw new AccessError('Este convite não existe ou já foi usado.', 404);
  if (new Date(user.invite.expiresAt).getTime() < Date.now()) throw new AccessError('Este convite expirou. Peça um novo ao administrador.', 410);
  if (password.length < 8) throw new AccessError('A senha precisa ter pelo menos 8 caracteres.', 400);
  patchUser(user.id, { name: name.trim() || user.name, status: 'active', invite: undefined, availability: 'available', lastSeenAt: now() });
  return userById(user.id);
}

export function updateUser(userId: Id, input: { roleId: Id; queueIds: Id[] }) {
  const user = userById(userId);
  const nextRole = db.roles.find((r) => r.id === input.roleId);
  if (!nextRole) throw new Error('Escolha um papel.');
  if (isAdmin(user) && !nextRole.system && user.status === 'active' && activeAdmins().length === 1) {
    throw new Error('A empresa precisa de pelo menos um administrador ativo.');
  }
  const previousRole = db.roles.find((r) => r.id === user.roleId);
  patchUser(userId, { roleId: input.roleId });
  setMemberships(userId, input.queueIds);
  audit('updated', 'user', user.name, 'Alterou papel e filas do usuário', {
    entityId: userId,
    changes: diff(
      { role: previousRole?.name, queues: db.queues.filter((q) => q.memberIds.includes(userId)).length },
      { role: nextRole.name, queues: input.queueIds.length },
      { role: 'Papel', queues: 'Filas' },
    ),
  });
}

// Desativar tira o acesso na hora e devolve os atendimentos da pessoa para as filas.
export function setUserStatus(userId: Id, status: 'active' | 'disabled', actorId: Id) {
  const user = userById(userId);
  if (status === 'disabled') {
    if (userId === actorId) throw new Error('Você não pode desativar o próprio acesso.');
    if (isAdmin(user) && activeAdmins().length === 1) throw new Error('A empresa precisa de pelo menos um administrador ativo.');
    patchUser(userId, { status: 'disabled', availability: 'offline', pauseReason: undefined });
    const orphaned = db.conversations.filter((c) => c.assigneeId === userId && ACTIVE.includes(c.status));
    for (const c of orphaned) {
      const queueId = c.queueId ?? db.queues.find((q) => q.isDefault)?.id;
      patchConversation(c.id, { assigneeId: undefined, status: 'queued', queueId });
      systemMessage(c.id, `Acesso de ${user.name} desativado; atendimento devolvido para a fila`);
    }
    new Set(orphaned.map((c) => db.conversations.find((x) => x.id === c.id)?.queueId)).forEach((q) => q && distribute(q));
    audit('disabled', 'user', user.name, `Desativou o acesso; ${orphaned.length} atendimento(s) voltaram para a fila`, {
      entityId: userId,
      changes: [{ field: 'Estado', from: 'active', to: 'disabled' }],
    });
    return orphaned.length;
  }
  if (user.status !== 'disabled') throw new Error('Este usuário não está desativado.');
  patchUser(userId, { status: 'active' });
  audit('enabled', 'user', user.name, 'Reativou o acesso', {
    entityId: userId,
    changes: [{ field: 'Estado', from: 'disabled', to: 'active' }],
  });
  return 0;
}

function validateRole(input: RoleInput, ignoreId?: Id) {
  if (!input.name.trim()) throw new Error('Informe o nome do papel.');
  if (db.roles.some((r) => r.id !== ignoreId && r.name.toLowerCase() === input.name.trim().toLowerCase())) {
    throw new Error('Já existe um papel com esse nome.');
  }
}

export function createRole(input: RoleInput): Role {
  validateRole(input);
  const role: Role = { ...input, name: input.name.trim(), description: input.description.trim(), id: id(), system: false };
  db.roles = [...db.roles, role];
  audit('created', 'role', role.name, `Criou o papel com ${role.permissions.length} permissão(ões)`, {
    entityId: role.id,
    changes: [{ field: 'Permissões', to: role.permissions.join(', ') || 'nenhuma' }],
  });
  return role;
}

export function updateRole(roleId: Id, input: RoleInput) {
  const role = db.roles.find((r) => r.id === roleId);
  if (!role) throw new NotFound('Papel não encontrado.');
  if (role.system) throw new Error('O papel Administrador não pode ser alterado.');
  validateRole(input, roleId);
  db.roles = db.roles.map((r) => (r.id === roleId ? { ...r, ...input, name: input.name.trim(), description: input.description.trim() } : r));
  // Permissão é o que mais importa na trilha: lista o que entrou e o que saiu, não a contagem.
  const added = input.permissions.filter((x) => !role.permissions.includes(x));
  const removed = role.permissions.filter((x) => !input.permissions.includes(x));
  const changes = diff({ name: role.name }, { name: input.name.trim() }, { name: 'Nome' });
  if (added.length) changes.push({ field: 'Permissões concedidas', to: added.join(', ') });
  if (removed.length) changes.push({ field: 'Permissões retiradas', to: removed.join(', ') });
  audit('updated', 'role', input.name.trim(), 'Alterou o papel', { entityId: roleId, changes });
}

export function deleteRole(roleId: Id) {
  const role = db.roles.find((r) => r.id === roleId);
  if (!role) throw new NotFound('Papel não encontrado.');
  if (role.system) throw new Error('O papel Administrador não pode ser excluído.');
  // Conta também desativados: se forem reativados, precisam continuar com um papel válido.
  const inUse = db.users.filter((u) => u.roleId === roleId).length;
  if (inUse) throw new Error(`${inUse} usuário(s) usam este papel. Troque o papel deles antes de excluir.`);
  db.roles = db.roles.filter((r) => r.id !== roleId);
  audit('deleted', 'role', role.name, 'Excluiu o papel', { entityId: roleId });
}

// ---------- Workflows: rascunho, publicação versionada e reversão ----------

function workflowById(workflowId: Id) {
  const workflow = db.workflows.find((w) => w.id === workflowId);
  if (!workflow) throw new NotFound('Workflow não encontrado.');
  return workflow;
}

function patchWorkflow(workflowId: Id, patch: Partial<Workflow>) {
  db.workflows = db.workflows.map((w) => (w.id === workflowId ? { ...w, ...patch } : w));
  return workflowById(workflowId);
}

export function createWorkflow(template: WorkflowTemplate, actorId: Id): Workflow {
  const base = templateInfo[template];
  const sameName = db.workflows.filter((w) => w.name.startsWith(base.name)).length;
  const workflow: Workflow = {
    id: id(),
    name: template === 'blank' ? `Novo workflow${sameName ? ` ${sameName + 1}` : ''}` : `${base.name}${sameName ? ` ${sameName + 1}` : ''}`,
    description: template === 'blank' ? '' : base.description,
    draft: templateDefinition(template),
    draftUpdatedAt: now(),
    draftUpdatedBy: actorId,
    versions: [],
    status: 'active',
    pauseAi: true,
    stats: { runs24h: 0, failures24h: 0 },
    createdAt: now(),
  };
  db.workflows = [...db.workflows, workflow];
  return workflow;
}

// Salvamento automático do rascunho (o editor chama a cada alteração, com atraso).
export function saveDraft(workflowId: Id, draft: WorkflowDefinition, actorId: Id) {
  return patchWorkflow(workflowId, { draft, draftUpdatedAt: now(), draftUpdatedBy: actorId });
}

export function updateWorkflowInfo(workflowId: Id, info: { name?: string; description?: string; pauseAi?: boolean }) {
  if (info.name !== undefined && !info.name.trim()) throw new Error('O nome não pode ficar em branco.');
  return patchWorkflow(workflowId, { ...info, ...(info.name !== undefined ? { name: info.name.trim() } : {}) });
}

// Publicar congela o rascunho como versão nova (imutável) e passa a rodar no atendimento.
export function publishWorkflow(workflowId: Id, note: string, actorId: Id) {
  const workflow = workflowById(workflowId);
  const issues = validateWorkflow(workflow.draft);
  if (issues.length) throw new Error(`Corrija ${issues.length} problema(s) antes de publicar.`);
  if (!note.trim()) throw new Error('Descreva o que mudou nesta versão.');
  const number = (workflow.versions.at(-1)?.number ?? 0) + 1;
  const version = { id: id(), number, definition: structuredClone(workflow.draft), note: note.trim(), publishedBy: actorId, publishedAt: now() };
  const previous = workflow.versions.find((v) => v.id === workflow.publishedVersionId);
  audit('published', 'workflow', workflow.name, `Publicou a versão ${number}: ${note.trim()}`, {
    entityId: workflowId,
    changes: [{ field: 'Versão publicada', from: previous ? String(previous.number) : undefined, to: String(number) }],
  });
  return patchWorkflow(workflowId, { versions: [...workflow.versions, version], publishedVersionId: version.id });
}

// Reversão: volta a rodar uma versão anterior, sem apagar as mais novas (o histórico fica completo).
export function publishExistingVersion(workflowId: Id, versionId: Id) {
  const workflow = workflowById(workflowId);
  if (!workflow.versions.some((v) => v.id === versionId)) throw new NotFound('Versão não encontrada.');
  return patchWorkflow(workflowId, { publishedVersionId: versionId });
}

// Copia uma versão para o rascunho, para editar a partir dela.
export function restoreVersionAsDraft(workflowId: Id, versionId: Id, actorId: Id) {
  const version = workflowById(workflowId).versions.find((v) => v.id === versionId);
  if (!version) throw new NotFound('Versão não encontrada.');
  return saveDraft(workflowId, structuredClone(version.definition), actorId);
}

export function setWorkflowStatus(workflowId: Id, status: Workflow['status']) {
  const workflow = workflowById(workflowId);
  if (status === 'active' && !workflow.publishedVersionId) throw new Error('Publique uma versão antes de ativar.');
  return patchWorkflow(workflowId, { status });
}

export function duplicateWorkflow(workflowId: Id, actorId: Id) {
  const source = workflowById(workflowId);
  const copy: Workflow = {
    ...structuredClone(source),
    id: id(),
    name: `${source.name} (cópia)`,
    versions: [],
    publishedVersionId: undefined,
    status: 'active',
    stats: { runs24h: 0, failures24h: 0 },
    draftUpdatedAt: now(),
    draftUpdatedBy: actorId,
    createdAt: now(),
  };
  db.workflows = [...db.workflows, copy];
  return copy;
}

export function deleteWorkflow(workflowId: Id) {
  workflowById(workflowId);
  db.workflows = db.workflows.filter((w) => w.id !== workflowId);
}
