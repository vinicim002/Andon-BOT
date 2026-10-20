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
  // Convite pendente: enviado por e-mail com link de uso único e validade. Some quando a pessoa ativa o acesso.
  invite?: { token: string; expiresAt: IsoDateTime; invitedBy: Id; sentAt: IsoDateTime };
}

// Permissões granulares; papéis são conjuntos delas (RBAC). O back-end valida cada ação —
// no console elas só escondem ou desabilitam o que a pessoa não pode fazer.
export type Permission =
  | 'conversations.view_all'
  | 'conversations.take_over'
  | 'conversations.reply'
  | 'conversations.transfer'
  | 'tickets.view'
  | 'tickets.manage'
  | 'contacts.view'
  | 'contacts.edit'
  | 'settings.queues'
  | 'settings.quick_replies'
  | 'settings.channels'
  | 'settings.integrations'
  | 'settings.knowledge'
  | 'settings.ai'
  | 'settings.audit'
  | 'settings.users'
  | 'workflows.manage';

export interface Role {
  id: Id;
  name: string;
  description: string;
  permissions: Permission[];
  // Papel do sistema: não pode ser editado nem excluído (garante que sempre exista um administrador).
  system: boolean;
}

export type RoleInput = Omit<Role, 'id' | 'system'>;

// Convite em lote: os mesmos papel e filas para todos os e-mails. O nome a pessoa confirma ao ativar.
export interface InviteInput {
  emails: string[];
  roleId: Id;
  queueIds: Id[];
}

export interface InviteResult {
  invited: User[];
  skipped: { email: string; reason: string }[];
}

export type TagColor = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan';

export interface Tag {
  id: Id;
  name: string;
  color: TagColor;
}

// Organização é entidade própria (no banco, a tabela `organization`): vários contatos
// apontam para a mesma empresa, e renomeá-la vale para todos de uma vez.
export interface Organization {
  id: Id;
  name: string;
  cnpj?: string;
  // Domínio de e-mail, usado para sugerir a empresa de um contato novo.
  domain?: string;
  notes?: string;
  createdAt: IsoDateTime;
}

// O contato embute nome e id da empresa, como a API vai serializar: a lista mostra a empresa
// sem uma segunda consulta, e o id permite filtrar e navegar.
export type OrganizationRef = Pick<Organization, 'id' | 'name'>;

export type OrganizationInput = Omit<Organization, 'id' | 'createdAt'>;

export interface Contact {
  id: Id;
  // Identificador curto exibido ao atendente (o id interno é UUID).
  code: string;
  name: string;
  phone: string;
  email?: string;
  jobTitle?: string;
  organization?: OrganizationRef;
  // CPF/CNPJ ficam em atributos de CRM; no banco, contact.attributes.
  cpf?: string;
  cnpj?: string;
  notes?: string;
  tags: Tag[];
  createdAt: IsoDateTime;
}

// O que a tela envia para criar ou editar um contato. A empresa vai por id — ou por nome novo,
// quando a pessoa cria a organização no mesmo formulário.
export interface ContactInput {
  name: string;
  phone: string;
  email?: string;
  jobTitle?: string;
  organizationId?: Id;
  newOrganizationName?: string;
  cpf?: string;
  cnpj?: string;
  notes?: string;
}

// Estado da ligação com o provedor, não do canal em si: um número desconectado continua
// existindo (e com histórico) — só para de receber e enviar.
export type ChannelStatus = 'connected' | 'pending' | 'error' | 'disabled';

// Qualidade e limite de envio vêm da Meta e não são editáveis aqui; só exibidos.
export type QualityRating = 'green' | 'yellow' | 'red';
export type MessagingTier = '250' | '1k' | '10k' | '100k' | 'unlimited';

// O que outras entidades precisam saber do canal de origem: identificação, nunca credencial.
// Conversa e mensagem carregam esta forma, não o endpoint completo.
export interface ChannelEndpointRef {
  id: Id;
  channelType: ChannelType;
  name: string;
  address: string;
}

export interface ChannelEndpoint extends ChannelEndpointRef {
  status: ChannelStatus;
  // Configuração do adaptador de canal. O núcleo canônico não conhece estes campos:
  // no banco eles ficam numa tabela do módulo `channel`, não em `channel_endpoint`.
  // Só a tela de Canais lê isto — por isso não entra em `ChannelEndpointRef`.
  whatsapp?: WhatsAppCloudConfig;
}

export interface WhatsAppCloudConfig {
  wabaId: string;
  phoneNumberId: string;
  // Nome aprovado pela Meta; aparece para o cliente no WhatsApp.
  verifiedName: string;
  // O token permanente nunca volta do back-end — só os últimos dígitos, para conferência.
  tokenHint: string;
  // URL e token que a pessoa cola no painel da Meta para o webhook apontar para cá.
  webhookUrl: string;
  webhookVerifyToken: string;
  quality?: QualityRating;
  tier?: MessagingTier;
  lastCheckedAt?: IsoDateTime;
  // Motivo da última falha de verificação; some quando a conexão volta.
  lastError?: string;
}

// O que a tela envia para conectar ou atualizar um número. O token só sobe: não desce nunca.
export interface ChannelEndpointInput {
  name: string;
  address: string;
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  // Filas que recebem as conversas deste número (N:N — no banco, endpoint_queue).
  queueIds: Id[];
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
  endpoint: ChannelEndpointRef;
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
