// Porta de entrada de dados do console. Hoje responde com mocks; quando o endpoint existir no
// back-end, só a implementação da função muda — as telas continuam iguais.
import * as mock from '../mocks/data';
import type { Contact, Conversation, Id, Message, OperationalQueue, Ticket, User } from '../domain/types';

const delay = <T,>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 150));

export const api = {
  currentUser: (): Promise<User> => delay(mock.currentUser),
  users: (): Promise<User[]> => delay(mock.users),
  queues: (): Promise<OperationalQueue[]> => delay(mock.queues),
  conversations: (): Promise<Conversation[]> => delay(mock.conversations),
  messages: (conversationId: Id): Promise<Message[]> =>
    delay(mock.messages.filter((m) => m.conversationId === conversationId)),
  contacts: (): Promise<Contact[]> => delay(mock.contacts),
  tickets: (): Promise<Ticket[]> => delay(mock.tickets),
};
