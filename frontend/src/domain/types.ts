// Modelo canônico visto pelo console. Espelha backend/src/main/resources/db/migration e serve de
// rascunho dos contratos de API: quando uma tela pedir um campo novo, ele nasce aqui primeiro.

export type Id = string;
export type IsoDateTime = string;

export type ConversationStatus =
  | 'new'
  | 'queued'
  | 'in_progress'
  | 'waiting_customer'
  | 'waiting_internal'
  | 'resolved'
  | 'closed';

export type ChannelType = 'whatsapp' | 'webchat' | 'voice';

export interface User {
  id: Id;
  name: string;
  email: string;
  online: boolean;
}

export interface Tag {
  id: Id;
  name: string;
  color: string;
}

export interface Contact {
  id: Id;
  name: string;
  phone: string;
  email?: string;
  organization?: string;
  tags: Tag[];
  createdAt: IsoDateTime;
}

export interface ChannelEndpoint {
  id: Id;
  channelType: ChannelType;
  name: string;
  address: string;
}

export interface OperationalQueue {
  id: Id;
  name: string;
  routingPolicy: 'round_robin' | 'manual';
  memberIds: Id[];
}

export interface Conversation {
  id: Id;
  contact: Contact;
  endpoint: ChannelEndpoint;
  queueId?: Id;
  assigneeId?: Id;
  status: ConversationStatus;
  botPaused: boolean;
  unreadCount: number;
  lastMessagePreview: string;
  lastMessageAt: IsoDateTime;
  ticketId?: Id;
}

export type MessageDirection = 'inbound' | 'outbound' | 'internal';
export type SenderType = 'contact' | 'user' | 'bot' | 'system';

export interface Message {
  id: Id;
  conversationId: Id;
  direction: MessageDirection;
  senderType: SenderType;
  senderUserId?: Id;
  body: string;
  deliveryStatus?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  createdAt: IsoDateTime;
}

export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export interface Ticket {
  id: Id;
  protocol: string;
  subject: string;
  contactId: Id;
  conversationId?: Id;
  assigneeId?: Id;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: IsoDateTime;
}
