// Dados fictícios para descoberta de produto. Nomes, telefones e empresas são inventados —
// nunca usar dados reais de clientes aqui (o repositório é público).
import type {
  ChannelEndpoint,
  Contact,
  Conversation,
  Message,
  OperationalQueue,
  Tag,
  Ticket,
  User,
} from '../domain/types';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export const currentUser: User = {
  id: 'u1',
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  online: true,
};

export const users: User[] = [
  currentUser,
  { id: 'u2', name: 'Bruno Lima', email: 'bruno@exemplo.com', online: true },
  { id: 'u3', name: 'Carla Mendes', email: 'carla@exemplo.com', online: false },
];

const tags: Record<string, Tag> = {
  vip: { id: 't1', name: 'VIP', color: 'warning' },
  entrega: { id: 't2', name: 'Entrega', color: 'info' },
  orcamento: { id: 't3', name: 'Orçamento', color: 'success' },
};

export const endpoints: ChannelEndpoint[] = [
  { id: 'e1', channelType: 'whatsapp', name: 'Atendimento', address: '+55 11 90000-0001' },
  { id: 'e2', channelType: 'whatsapp', name: 'Comercial', address: '+55 11 90000-0002' },
];

export const queues: OperationalQueue[] = [
  { id: 'q1', name: 'Suporte', routingPolicy: 'round_robin', memberIds: ['u1', 'u2'] },
  { id: 'q2', name: 'Comercial', routingPolicy: 'round_robin', memberIds: ['u2', 'u3'] },
  { id: 'q3', name: 'Financeiro', routingPolicy: 'manual', memberIds: ['u3'] },
];

export const contacts: Contact[] = [
  { id: 'c1', name: 'Marcos Pereira', phone: '+55 11 91234-0001', organization: 'Transportes Exemplo', tags: [tags.vip, tags.entrega], createdAt: minutesAgo(60 * 24 * 40) },
  { id: 'c2', name: 'Juliana Rocha', phone: '+55 21 91234-0002', email: 'juliana@exemplo.com', tags: [tags.orcamento], createdAt: minutesAgo(60 * 24 * 12) },
  { id: 'c3', name: 'Pedro Alves', phone: '+55 31 91234-0003', organization: 'Loja Fictícia', tags: [], createdAt: minutesAgo(60 * 24 * 3) },
  { id: 'c4', name: 'Fernanda Dias', phone: '+55 41 91234-0004', tags: [tags.entrega], createdAt: minutesAgo(60 * 5) },
  { id: 'c5', name: '+55 51 91234-0005', phone: '+55 51 91234-0005', tags: [], createdAt: minutesAgo(3) },
];

export const conversations: Conversation[] = [
  { id: 'v1', contact: contacts[0], endpoint: endpoints[0], queueId: 'q1', assigneeId: 'u1', status: 'in_progress', botPaused: true, unreadCount: 2, lastMessagePreview: 'A entrega estava prevista para ontem…', lastMessageAt: minutesAgo(2), ticketId: 'k1' },
  { id: 'v2', contact: contacts[4], endpoint: endpoints[0], status: 'new', botPaused: false, unreadCount: 1, lastMessagePreview: 'Olá, bom dia!', lastMessageAt: minutesAgo(3) },
  { id: 'v3', contact: contacts[1], endpoint: endpoints[1], queueId: 'q2', status: 'queued', botPaused: false, unreadCount: 3, lastMessagePreview: 'Gostaria de um orçamento para 200 unidades', lastMessageAt: minutesAgo(9) },
  { id: 'v4', contact: contacts[2], endpoint: endpoints[0], queueId: 'q1', assigneeId: 'u1', status: 'waiting_customer', botPaused: true, unreadCount: 0, lastMessagePreview: 'Você: Pode me enviar a nota fiscal?', lastMessageAt: minutesAgo(45), ticketId: 'k2' },
  { id: 'v5', contact: contacts[3], endpoint: endpoints[0], queueId: 'q1', assigneeId: 'u2', status: 'waiting_internal', botPaused: true, unreadCount: 0, lastMessagePreview: 'Vou verificar com a transportadora', lastMessageAt: minutesAgo(120) },
];

export const messages: Message[] = [
  { id: 'm1', conversationId: 'v1', direction: 'inbound', senderType: 'contact', body: 'Boa tarde, meu pedido 4521 ainda não chegou.', createdAt: minutesAgo(30) },
  { id: 'm2', conversationId: 'v1', direction: 'outbound', senderType: 'bot', body: 'Olá, Marcos! Encontrei o pedido 4521. Vou te transferir para um atendente.', deliveryStatus: 'read', createdAt: minutesAgo(29) },
  { id: 'm3', conversationId: 'v1', direction: 'internal', senderType: 'system', body: 'Conversa atribuída a Ana Souza na fila Suporte', createdAt: minutesAgo(28) },
  { id: 'm4', conversationId: 'v1', direction: 'outbound', senderType: 'user', senderUserId: 'u1', body: 'Oi, Marcos! Sou a Ana. Já estou verificando o status com a transportadora.', deliveryStatus: 'read', createdAt: minutesAgo(25) },
  { id: 'm5', conversationId: 'v1', direction: 'internal', senderType: 'user', senderUserId: 'u1', body: 'Nota interna: transportadora informou atraso na rota sul.', createdAt: minutesAgo(10) },
  { id: 'm6', conversationId: 'v1', direction: 'inbound', senderType: 'contact', body: 'A entrega estava prevista para ontem…', createdAt: minutesAgo(3) },
  { id: 'm7', conversationId: 'v1', direction: 'inbound', senderType: 'contact', body: 'Consegue me dar uma previsão?', createdAt: minutesAgo(2) },
  { id: 'm8', conversationId: 'v2', direction: 'inbound', senderType: 'contact', body: 'Olá, bom dia!', createdAt: minutesAgo(3) },
  { id: 'm9', conversationId: 'v3', direction: 'inbound', senderType: 'contact', body: 'Gostaria de um orçamento para 200 unidades', createdAt: minutesAgo(9) },
  { id: 'm10', conversationId: 'v4', direction: 'outbound', senderType: 'user', senderUserId: 'u1', body: 'Pode me enviar a nota fiscal?', deliveryStatus: 'delivered', createdAt: minutesAgo(45) },
];

export const tickets: Ticket[] = [
  { id: 'k1', protocol: '2026101700001', subject: 'Atraso na entrega do pedido 4521', contactId: 'c1', conversationId: 'v1', assigneeId: 'u1', priority: 'high', status: 'in_progress', createdAt: minutesAgo(28) },
  { id: 'k2', protocol: '2026101700002', subject: 'Divergência na nota fiscal', contactId: 'c3', conversationId: 'v4', assigneeId: 'u1', priority: 'normal', status: 'waiting', createdAt: minutesAgo(50) },
  { id: 'k3', protocol: '2026101600014', subject: 'Solicitação de segunda via de boleto', contactId: 'c2', assigneeId: 'u3', priority: 'low', status: 'resolved', createdAt: minutesAgo(60 * 26) },
  { id: 'k4', protocol: '2026101600009', subject: 'Avaria na mercadoria recebida', contactId: 'c4', assigneeId: 'u2', priority: 'urgent', status: 'open', createdAt: minutesAgo(60 * 30) },
];
