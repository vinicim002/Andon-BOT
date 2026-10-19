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

// Disponibilidade do atendente: só quem está "available" recebe atendimentos pelo rodízio.
export type Availability = 'available' | 'paused' | 'offline';

export type UserStatus = 'active' | 'invited' | 'disabled';

export interface User {
  id: Id;
  name: string;
  email: string;
  roleId: Id;
  status: UserStatus;
  availability: Availability;
  pauseReason?: string;
  lastSeenAt?: IsoDateTime;
  // Convite pendente: link de uso único com validade. Some quando a pessoa ativa o acesso.
  invite?: { token: string; expiresAt: IsoDateTime; invitedBy: Id };
}

// Permissões granulares; papéis são conjuntos delas (RBAC). O back-end valida cada ação —
// no console elas só escondem ou desabilitam o que a pessoa não pode fazer.
export type Permission =
  | 'conversations.view_all'
  | 'conversations.reply'
  | 'conversations.transfer'
  | 'tickets.view'
  | 'tickets.manage'
  | 'contacts.view'
  | 'contacts.edit'
  | 'settings.queues'
  | 'settings.quick_replies'
  | 'settings.users';

export interface Role {
  id: Id;
  name: string;
  description: string;
  permissions: Permission[];
  // Papel do sistema: não pode ser editado nem excluído (garante que sempre exista um administrador).
  system: boolean;
}

export type RoleInput = Omit<Role, 'id' | 'system'>;

export interface InviteInput {
  name: string;
  email: string;
  roleId: Id;
  queueIds: Id[];
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

export type RoutingPolicy = 'round_robin' | 'manual';

export interface OperationalQueue {
  id: Id;
  name: string;
  color: TagColor;
  routingPolicy: RoutingPolicy;
  memberIds: Id[];
  // Números/canais que entregam conversas nesta fila (N:N — no banco, endpoint_queue).
  endpointIds: Id[];
  // Fila que recebe conversas sem destino definido; existe sempre exatamente uma.
  isDefault: boolean;
}

export type QueueInput = Omit<OperationalQueue, 'id'>;
export type QuickReplyInput = Omit<QuickReply, 'id'>;

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
  // Gerado na criação e imutável (no banco, trigger impede alteração).
  protocol: string;
  subject: string;
  description?: string;
  contactId: Id;
  conversationId?: Id;
  assigneeId?: Id;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

// Trilha de auditoria do ticket: cada mudança vira um evento, nada é sobrescrito.
export type TicketEventType = 'created' | 'status_changed' | 'priority_changed' | 'assigned' | 'comment';

export interface TicketEvent {
  id: Id;
  ticketId: Id;
  type: TicketEventType;
  actorUserId?: Id;
  from?: string;
  to?: string;
  body?: string;
  createdAt: IsoDateTime;
}

// Resposta rápida: acionada por "/atalho" no campo de mensagem. {{nome}} vira o primeiro nome do contato.
export interface QuickReply {
  id: Id;
  shortcut: string;
  title: string;
  body: string;
}

export interface NewTicket {
  subject: string;
  description?: string;
  priority: TicketPriority;
  contactId: Id;
  conversationId?: Id;
  assigneeId?: Id;
}

export type TransferTarget = { kind: 'user'; userId: Id } | { kind: 'queue'; queueId: Id };
