// Porta de entrada de dados do console. Hoje conversa com o servidor fictício em memória
// (mocks/server.ts); quando o endpoint existir no back-end, só a implementação da função muda.
// Toda mutação avisa as consultas abertas (notifyChange), como a invalidação de cache fará depois.
import * as server from '../mocks/server';
import type {
  Availability,
  ChannelEndpoint,
  Contact,
  Conversation,
  Id,
  Message,
  NewTicket,
  InviteInput,
  OperationalQueue,
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

export const api = {
  // Mock: entra com o e-mail de qualquer usuário ativo e uma senha de 4+ caracteres.
  signIn: async (email: string, password: string): Promise<User> => {
    await delay(null, 400);
    return mutate(() => server.authenticate(email, password));
  },
  findInvite: (token: string) => delay(server.findInvite(token)),
  acceptInvite: (token: string, name: string, password: string) => mutate(() => server.acceptInvite(token, name, password)),

  roles: (): Promise<Role[]> => delay(db.roles),
  invite: (input: InviteInput, actorId: Id) => mutate(() => server.invite(input, actorId)),
  resendInvite: (userId: Id, actorId: Id) => mutate(() => server.resendInvite(userId, actorId)),
  revokeInvite: (userId: Id) => mutate(() => server.revokeInvite(userId)),
  updateUser: (userId: Id, input: { roleId: Id; queueIds: Id[] }) => mutate(() => server.updateUser(userId, input)),
  // Devolve quantos atendimentos voltaram para a fila (ao desativar).
  setUserStatus: (userId: Id, status: 'active' | 'disabled', actorId: Id) => mutate(() => server.setUserStatus(userId, status, actorId)),
  createRole: (input: RoleInput) => mutate(() => server.createRole(input)),
  updateRole: (roleId: Id, input: RoleInput) => mutate(() => server.updateRole(roleId, input)),
  deleteRole: (roleId: Id) => mutate(() => server.deleteRole(roleId)),

  users: (): Promise<User[]> => delay(db.users),
  endpoints: (): Promise<ChannelEndpoint[]> => delay(db.endpoints),
  // Devolve quantas conversas o rodízio entregou a quem ficou disponível.
  setAvailability: (userId: Id, availability: Availability, pauseReason?: string) =>
    mutate(() => server.setAvailability(userId, availability, pauseReason)),
  queues: (): Promise<OperationalQueue[]> => delay(db.queues),
  tags: (): Promise<Tag[]> => delay(db.tags),
  quickReplies: (): Promise<QuickReply[]> => delay(db.quickReplies),
  contacts: (): Promise<Contact[]> => delay(db.contacts),

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
