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

export type TagColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan';

export interface Tag {
  id: Id;
  name: string;
  color: TagColor;
}

export interface Contact {
  id: Id;
  // Identificador curto exibido ao atendente (o id interno é UUID).
  code: string;
  name: string;
  phone: string;
  email?: string;
  jobTitle?: string;
  organization?: string;
  // CPF/CNPJ ficam em atributos de CRM; no banco, contact.attributes.
  cpf?: string;
  cnpj?: string;
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
  color: TagColor;
  routingPolicy: 'round_robin' | 'manual';
  memberIds: Id[];
}

export type ContentType = 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Conversation {
  id: Id;
  contact: Contact;
  endpoint: ChannelEndpoint;
  queueId?: Id;
  assigneeId?: Id;
  // Outros atendentes que participaram (aparecem na lista e na trilha).
  participantIds: Id[];
  status: ConversationStatus;
  botPaused: boolean;
  tags: Tag[];
  unreadCount: number;
  contactTyping: boolean;
  lastMessage: {
    preview: string;
    contentType: ContentType;
    direction: 'inbound' | 'outbound';
    deliveryStatus?: DeliveryStatus;
    at: IsoDateTime;
  };
  // WhatsApp só permite mensagem livre até 24h após a última mensagem do cliente.
  windowExpiresAt?: IsoDateTime;
  autoResolveAt?: IsoDateTime;
  // Prazo de primeira resposta; vencido aparece em destaque na lista.
  slaDueAt?: IsoDateTime;
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
  contentType: ContentType;
  body?: string;
  mediaUrl?: string;
  forwarded?: boolean;
  replyTo?: { authorName: string; preview: string; contentType: ContentType };
  deliveryStatus?: DeliveryStatus;
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
