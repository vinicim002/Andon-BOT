// Porta de entrada de dados do console. Hoje conversa com o servidor fictício em memória
// (mocks/server.ts); quando o endpoint existir no back-end, só a implementação da função muda.
// Toda mutação avisa as consultas abertas (notifyChange), como a invalidação de cache fará depois.
import * as server from '../mocks/server';
import type {
  Availability,
  ChannelEndpoint,
  ChannelEndpointInput,
  ChannelStatus,
  Contact,
  ContactInput,
  Conversation,
  Id,
  Message,
  NewTicket,
  InviteInput,
  OperationalQueue,
  Organization,
  OrganizationInput,
  QueueInput,
  QuickReply,
  QuickReplyInput,
  Role,
  RoleInput,
  Tag,
  TagColor,
  Ticket,
  TicketEvent,
  TicketPriority,
  TicketStatus,
  TransferTarget,
  User,
} from '../domain/types';
import type { AiPolicy, KnowledgeSource, SourceInput } from '../domain/ai';
import type { AuditEvent } from '../domain/audit';
import type { Integration, IntegrationInput, IntegrationRun, IntegrationStatus } from '../domain/integration';
import type { Workflow, WorkflowDefinition, WorkflowTemplate } from '../domain/workflow';
import { notifyChange } from './events';

const delay = <T,>(value: T, ms = 120) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Executa a mutação "no servidor", espera a latência simulada e avisa quem está lendo.
async function mutate<T>(action: () => T): Promise<T> {
  await delay(null, 80);
  try {
    const result = action();
    server.persist();
    notifyChange();
    return result;
  } catch (error) {
    const status = error instanceof server.AccessError ? error.status : 400;
    throw new ApiError(error instanceof Error ? error.message : 'Erro inesperado.', status);
  }
}

const { db } = server;

// Credenciais do atalho de login em desenvolvimento. Saem daqui junto com o mock, quando o
// back-end emitir a sessão de verdade — a tela não precisa conhecer `mocks/`.
export { demoAccess } from '../mocks/data';

export const api = {
  // Mock: entra com o e-mail de qualquer usuário ativo e uma senha de 4+ caracteres.
  signIn: async (email: string, password: string): Promise<User> => {
    await delay(null, 400);
    const user = await mutate(() => server.authenticate(email, password));
    server.setActor(user.id);
    return user;
  },
  // Informa ao "servidor" quem está na sessão, para a auditoria registrar o ator. Com o
  // back-end real isso desaparece: o ator sai do cookie de sessão, não de uma chamada da tela.
  setActor: (userId?: Id) => server.setActor(userId),
  findInvite: (token: string) => delay(server.findInvite(token)),
  acceptInvite: (token: string, name: string, password: string) => mutate(() => server.acceptInvite(token, name, password)),

  roles: (): Promise<Role[]> => delay(db.roles),
  invite: (input: InviteInput, actorId: Id) => mutate(() => server.invite(input, actorId)),
  resendInvite: (userId: Id, actorId: Id) => mutate(() => server.resendInvite(userId, actorId)),
  revokeInvite: (userId: Id) => mutate(() => server.revokeInvite(userId)),
  updateUser: (userId: Id, input: { roleId: Id; queueIds: Id[] }) => mutate(() => server.updateUser(userId, input)),
  // Devolve quantos atendimentos voltaram para a fila (ao desativar).
  setUserStatus: (userId: Id, status: 'active' | 'disabled', actorId: Id) => mutate(() => server.setUserStatus(userId, status, actorId)),
  workflows: (): Promise<Workflow[]> => delay(db.workflows),
  workflow: async (workflowId: Id): Promise<Workflow> => {
    const workflow = db.workflows.find((w) => w.id === workflowId);
    if (!workflow) throw new ApiError('Workflow não encontrado.', 404);
    return delay(workflow);
  },
  createWorkflow: (template: WorkflowTemplate, actorId: Id) => mutate(() => server.createWorkflow(template, actorId)),
  saveWorkflowDraft: (workflowId: Id, draft: WorkflowDefinition, actorId: Id) => mutate(() => server.saveDraft(workflowId, draft, actorId)),
  updateWorkflowInfo: (workflowId: Id, info: { name?: string; description?: string; pauseAi?: boolean }) =>
    mutate(() => server.updateWorkflowInfo(workflowId, info)),
  publishWorkflow: (workflowId: Id, note: string, actorId: Id) => mutate(() => server.publishWorkflow(workflowId, note, actorId)),
  publishWorkflowVersion: (workflowId: Id, versionId: Id) => mutate(() => server.publishExistingVersion(workflowId, versionId)),
  restoreWorkflowVersion: (workflowId: Id, versionId: Id, actorId: Id) => mutate(() => server.restoreVersionAsDraft(workflowId, versionId, actorId)),
  setWorkflowStatus: (workflowId: Id, status: Workflow['status']) => mutate(() => server.setWorkflowStatus(workflowId, status)),
  duplicateWorkflow: (workflowId: Id, actorId: Id) => mutate(() => server.duplicateWorkflow(workflowId, actorId)),
  deleteWorkflow: (workflowId: Id) => mutate(() => server.deleteWorkflow(workflowId)),

  createRole: (input: RoleInput) => mutate(() => server.createRole(input)),
  updateRole: (roleId: Id, input: RoleInput) => mutate(() => server.updateRole(roleId, input)),
  deleteRole: (roleId: Id) => mutate(() => server.deleteRole(roleId)),

  users: (): Promise<User[]> => delay(db.users),
  endpoints: (): Promise<ChannelEndpoint[]> => delay(db.endpoints),
  connectChannel: (input: ChannelEndpointInput) => mutate(() => server.connectChannel(input)),
  updateChannel: (endpointId: Id, input: ChannelEndpointInput) => mutate(() => server.updateChannel(endpointId, input)),
  // Verifica a conexão com o provedor e devolve o canal com o resultado já aplicado.
  testChannel: (endpointId: Id) => mutate(() => server.testChannel(endpointId)),
  setChannelStatus: (endpointId: Id, status: ChannelStatus) => mutate(() => server.setChannelStatus(endpointId, status)),
  deleteChannel: (endpointId: Id) => mutate(() => server.deleteChannel(endpointId)),
  // Devolve quantas conversas o rodízio entregou a quem ficou disponível.
  setAvailability: (userId: Id, availability: Availability, pauseReason?: string) =>
    mutate(() => server.setAvailability(userId, availability, pauseReason)),
  queues: (): Promise<OperationalQueue[]> => delay(db.queues),
  tags: (): Promise<Tag[]> => delay(db.tags),
  quickReplies: (): Promise<QuickReply[]> => delay(db.quickReplies),
  contacts: (): Promise<Contact[]> => delay(db.contacts),
  contact: async (contactId: Id): Promise<Contact> => {
    const contact = db.contacts.find((c) => c.id === contactId);
    if (!contact) throw new ApiError('Contato não encontrado.', 404);
    return delay(contact);
  },
  createContact: (input: ContactInput) => mutate(() => server.createContact(input)),
  saveContact: (contactId: Id, input: ContactInput) => mutate(() => server.saveContact(contactId, input)),
  setContactTags: (contactId: Id, tags: Tag[]) => mutate(() => server.setContactTags(contactId, tags)),
  deleteContact: (contactId: Id) => mutate(() => server.deleteContact(contactId)),
  conversationsByContact: (contactId: Id): Promise<Conversation[]> =>
    delay(db.conversations.filter((c) => c.contact.id === contactId)),

  organizations: (): Promise<Organization[]> => delay(db.organizations),
  organization: async (organizationId: Id): Promise<Organization> => {
    const organization = db.organizations.find((o) => o.id === organizationId);
    if (!organization) throw new ApiError('Organização não encontrada.', 404);
    return delay(organization);
  },
  createOrganization: (input: OrganizationInput) => mutate(() => server.createOrganization(input)),
  saveOrganization: (organizationId: Id, input: OrganizationInput) => mutate(() => server.updateOrganization(organizationId, input)),
  deleteOrganization: (organizationId: Id) => mutate(() => server.deleteOrganization(organizationId)),

  integrations: (): Promise<Integration[]> => delay(db.integrations),
  integrationRuns: (integrationId?: Id): Promise<IntegrationRun[]> =>
    delay(integrationId ? db.integrationRuns.filter((r) => r.integrationId === integrationId) : db.integrationRuns),
  createIntegration: (input: IntegrationInput) => mutate(() => server.createIntegration(input)),
  saveIntegration: (integrationId: Id, input: IntegrationInput) => mutate(() => server.updateIntegration(integrationId, input)),
  setIntegrationStatus: (integrationId: Id, status: IntegrationStatus) =>
    mutate(() => server.setIntegrationStatus(integrationId, status)),
  deleteIntegration: (integrationId: Id) => mutate(() => server.deleteIntegration(integrationId)),
  // Dispara a operação e devolve a execução registrada, já visível no log.
  testIntegration: (integrationId: Id, operationId: Id) => mutate(() => server.testIntegration(integrationId, operationId)),
  // Nomes dos workflows que dependem desta integração; a tela avisa antes de desativar.
  workflowsUsingIntegration: (integrationId: Id): Promise<string[]> => delay(server.workflowsUsingIntegration(integrationId)),

  knowledgeSources: (): Promise<KnowledgeSource[]> => delay(db.knowledgeSources),
  createSource: (input: SourceInput) => mutate(() => server.createSource(input)),
  saveSource: (sourceId: Id, input: SourceInput) => mutate(() => server.updateSource(sourceId, input)),
  // Reindexa e devolve a fonte com o resultado já aplicado.
  reindexSource: (sourceId: Id) => mutate(() => server.reindexSource(sourceId)),
  deleteSource: (sourceId: Id) => mutate(() => server.deleteSource(sourceId)),
  // Nomes dos workflows que citam esta fonte; a tela avisa antes de remover.
  workflowsUsingSource: (sourceId: Id): Promise<string[]> => delay(server.workflowsUsingSource(sourceId)),

  aiPolicy: (): Promise<AiPolicy> => delay(db.aiPolicy),

  auditEvents: (): Promise<AuditEvent[]> => delay(db.auditEvents),
  saveAiPolicy: (policy: AiPolicy) => mutate(() => server.saveAiPolicy(policy)),
  // Pergunta de teste: devolve a resposta, as citações e o motivo do handoff quando houver.
  askAi: (question: string) => mutate(() => server.askAi(question)),

  conversations: (): Promise<Conversation[]> => delay(db.conversations),
  messages: (conversationId: Id): Promise<Message[]> => delay(db.messages.filter((m) => m.conversationId === conversationId)),

  tickets: (): Promise<Ticket[]> => delay(db.tickets),
  ticket: async (ticketId: Id): Promise<Ticket> => {
    const ticket = db.tickets.find((t) => t.id === ticketId);
    if (!ticket) throw new ApiError('Ticket não encontrado.', 404);
    return delay(ticket);
  },
  ticketEvents: (ticketId: Id): Promise<TicketEvent[]> => delay(db.ticketEvents.filter((e) => e.ticketId === ticketId)),
  ticketsByContact: (contactId: Id): Promise<Ticket[]> => delay(db.tickets.filter((t) => t.contactId === contactId)),

  conversation: {
    markRead: (conversationId: Id) => mutate(() => server.markRead(conversationId)),
    assign: (conversationId: Id, actorId: Id) => mutate(() => server.assign(conversationId, actorId)),
    transfer: (conversationId: Id, target: TransferTarget, note: string | undefined, actorId: Id) =>
      mutate(() => server.transfer(conversationId, target, note, actorId)),
    setBotPaused: (conversationId: Id, paused: boolean, actorId: Id) => mutate(() => server.setBotPaused(conversationId, paused, actorId)),
    resolve: (conversationId: Id, actorId: Id) => mutate(() => server.resolve(conversationId, actorId)),
    reopen: (conversationId: Id, actorId: Id) => mutate(() => server.reopen(conversationId, actorId)),
    send: (conversationId: Id, body: string, internal: boolean, actorId: Id) =>
      mutate(() => server.sendMessage(conversationId, body, internal, actorId)),
    setTags: (conversationId: Id, tags: Tag[]) => mutate(() => server.setConversationTags(conversationId, tags)),
  },

  updateContact: (contactId: Id, patch: Partial<Contact>) => mutate(() => server.updateContact(contactId, patch)),
  createTag: (name: string, color: TagColor) => mutate(() => server.createTag(name, color)),

  createTicket: (input: NewTicket, actorId: Id) => mutate(() => server.createTicket(input, actorId)),
  updateTicket: (ticketId: Id, patch: { status?: TicketStatus; priority?: TicketPriority; assigneeId?: Id }, actorId: Id) =>
    mutate(() => server.updateTicket(ticketId, patch, actorId)),
  commentTicket: (ticketId: Id, body: string, actorId: Id) => mutate(() => server.commentTicket(ticketId, body, actorId)),

  createQueue: (input: QueueInput) => mutate(() => server.createQueue(input)),
  updateQueue: (queueId: Id, input: QueueInput) => mutate(() => server.updateQueue(queueId, input)),
  // Devolve quantas conversas foram movidas para a fila padrão.
  deleteQueue: (queueId: Id) => mutate(() => server.deleteQueue(queueId)),

  createQuickReply: (input: QuickReplyInput) => mutate(() => server.createQuickReply(input)),
  updateQuickReply: (replyId: Id, input: QuickReplyInput) => mutate(() => server.updateQuickReply(replyId, input)),
  deleteQuickReply: (replyId: Id) => mutate(() => server.deleteQuickReply(replyId)),
};
