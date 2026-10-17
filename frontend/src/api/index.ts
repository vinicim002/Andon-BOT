// Porta de entrada de dados do console. Hoje responde com mocks; quando o endpoint existir no
// back-end, só a implementação da função muda — as telas continuam iguais.
import * as mock from '../mocks/data';
import type { Contact, Conversation, Id, Message, OperationalQueue, Tag, Ticket, User } from '../domain/types';

const delay = <T,>(value: T, ms = 150) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const api = {
  // Mock: qualquer e-mail com senha de 4+ caracteres entra como a usuária de demonstração.
  signIn: async (email: string, password: string): Promise<User> => {
    await delay(null, 500);
    if (password.length < 4) throw new ApiError('Usuário ou senha incorretos.', 401);
    return { ...mock.currentUser, email };
  },
  currentUser: (): Promise<User> => delay(mock.currentUser),
  users: (): Promise<User[]> => delay(mock.users),
  queues: (): Promise<OperationalQueue[]> => delay(mock.queues),
  conversations: (): Promise<Conversation[]> => delay(mock.conversations),
  messages: (conversationId: Id): Promise<Message[]> =>
    delay(mock.messages.filter((m) => m.conversationId === conversationId)),
  contacts: (): Promise<Contact[]> => delay(mock.contacts),
  tags: (): Promise<Tag[]> => delay(mock.tagCatalog),
  tickets: (): Promise<Ticket[]> => delay(mock.tickets),
  ticketsByContact: (contactId: Id): Promise<Ticket[]> =>
    delay(mock.tickets.filter((t) => t.contactId === contactId)),
};
