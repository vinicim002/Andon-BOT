// Porta de entrada de dados do console. Hoje conversa com o servidor fictício em memória
// (mocks/server.ts); quando o endpoint existir no back-end, só a implementação da função muda.
// Toda mutação avisa as consultas abertas (notifyChange), como a invalidação de cache fará depois.
import * as server from '../mocks/server';
import type {
  Contact,
  Conversation,
  Id,
  Message,
  NewTicket,
  OperationalQueue,
  QuickReply,
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
    throw new ApiError(error instanceof Error ? error.message : 'Erro inesperado.', 400);
  }
}

const { db } = server;

export const api = {
  // Mock: qualquer e-mail com senha de 4+ caracteres entra como a usuária de demonstração.
  signIn: async (email: string, password: string): Promise<User> => {
    await delay(null, 500);
    if (password.length < 4) throw new ApiError('Usuário ou senha incorretos.', 401);
    return { ...db.users[0], email };
  },

  users: (): Promise<User[]> => delay(db.users),
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
};
