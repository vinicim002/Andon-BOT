// Dados fictícios para descoberta de produto. Nomes, telefones, documentos e empresas são
// inventados — nunca usar dados reais de clientes aqui (o repositório é público).
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
const minutesFromNow = (m: number) => minutesAgo(-m);

export const currentUser: User = { id: 'u1', name: 'Ana Souza', email: 'ana@exemplo.com', online: true };

export const users: User[] = [
  currentUser,
  { id: 'u2', name: 'Bruno Lima', email: 'bruno@exemplo.com', online: true },
  { id: 'u3', name: 'Carla Mendes', email: 'carla@exemplo.com', online: false },
];

const tags: Record<string, Tag> = {
  cotacao: { id: 't1', name: 'Cotação', color: 'orange' },
  coleta: { id: 't2', name: 'Coleta', color: 'green' },
  sinistro: { id: 't3', name: 'Sinistro', color: 'red' },
  avaria: { id: 't4', name: 'Avaria', color: 'red' },
  financeiro: { id: 't5', name: 'Financeiro', color: 'purple' },
  vip: { id: 't6', name: 'VIP', color: 'blue' },
};

export const tagCatalog: Tag[] = Object.values(tags);

export const endpoints: ChannelEndpoint[] = [
  { id: 'e1', channelType: 'whatsapp', name: 'WhatsApp Principal', address: '+55 11 90000-0001' },
  { id: 'e2', channelType: 'whatsapp', name: 'WhatsApp Comercial', address: '+55 11 90000-0002' },
];

export const queues: OperationalQueue[] = [
  { id: 'q1', name: 'Comercial', color: 'green', routingPolicy: 'round_robin', memberIds: ['u1', 'u2'] },
  { id: 'q2', name: 'Suporte', color: 'blue', routingPolicy: 'round_robin', memberIds: ['u1', 'u3'] },
  { id: 'q3', name: 'Financeiro', color: 'purple', routingPolicy: 'manual', memberIds: ['u3'] },
];

export const contacts: Contact[] = [
  { id: 'c1', code: '1000101', name: 'Marcos Pereira', phone: '+55 11 91234-0001', email: 'marcos@transportesexemplo.com.br', jobTitle: 'Gerente de Logística', organization: 'Transportes Exemplo', cpf: '000.000.001-91', cnpj: '00.000.000/0001-91', tags: [tags.cotacao, tags.vip], createdAt: minutesAgo(60 * 24 * 40) },
  { id: 'c2', code: '1000102', name: 'Juliana Rocha', phone: '+55 21 91234-0002', email: 'juliana@farmaficticia.com.br', jobTitle: 'Compradora', organization: 'Farma Fictícia', tags: [tags.sinistro, tags.avaria], createdAt: minutesAgo(60 * 24 * 12) },
  { id: 'c3', code: '1000103', name: 'Pedro Alves', phone: '+55 31 91234-0003', organization: 'Grupo Modelo', tags: [tags.financeiro], createdAt: minutesAgo(60 * 24 * 3) },
  { id: 'c4', code: '1000104', name: 'Fernanda Dias', phone: '+55 41 91234-0004', organization: 'Móveis Demonstração', tags: [tags.cotacao, tags.coleta], createdAt: minutesAgo(60 * 5) },
  { id: 'c5', code: '1000105', name: 'Rafael Nunes', phone: '+55 51 91234-0005', organization: 'Alimentos Teste', tags: [], createdAt: minutesAgo(60 * 30) },
  { id: 'c6', code: '1000106', name: '+55 61 91234-0006', phone: '+55 61 91234-0006', tags: [], createdAt: minutesAgo(4) },
  { id: 'c7', code: '1000107', name: 'Luana Castro', phone: '+55 71 91234-0007', organization: 'Distribuidora Amostra', tags: [], createdAt: minutesAgo(60 * 3) },
];

const byId = (id: string) => contacts.find((c) => c.id === id)!;

export const conversations: Conversation[] = [
  {
    id: 'v1', contact: byId('c4'), endpoint: endpoints[0], queueId: 'q1', assigneeId: 'u1', participantIds: [],
    status: 'in_progress', botPaused: true, tags: [tags.cotacao, tags.coleta], unreadCount: 2, contactTyping: true,
    lastMessage: { preview: 'Consigo agendar para quinta?', contentType: 'text', direction: 'inbound', at: minutesAgo(0) },
    windowExpiresAt: minutesFromNow(60 * 23 + 50), autoResolveAt: minutesFromNow(60 * 6),
  },
  {
    id: 'v2', contact: byId('c1'), endpoint: endpoints[0], queueId: 'q1', assigneeId: 'u1', participantIds: ['u2'],
    status: 'in_progress', botPaused: true, tags: [tags.cotacao], unreadCount: 1, contactTyping: false,
    lastMessage: { preview: 'Imagem', contentType: 'image', direction: 'inbound', at: minutesAgo(3) },
    windowExpiresAt: minutesFromNow(60 * 4 + 22), autoResolveAt: minutesFromNow(5 * 60 + 59), slaDueAt: minutesAgo(3), ticketId: 'k1',
  },
  {
    id: 'v3', contact: byId('c2'), endpoint: endpoints[0], queueId: 'q2', assigneeId: 'u1', participantIds: [],
    status: 'waiting_customer', botPaused: true, tags: [tags.sinistro, tags.avaria], unreadCount: 0, contactTyping: false,
    lastMessage: { preview: 'Meu cliente reclamou que a carga chegou com avaria', contentType: 'text', direction: 'outbound', deliveryStatus: 'read', at: minutesAgo(25) },
    windowExpiresAt: minutesFromNow(60 * 20), ticketId: 'k2',
  },
  {
    id: 'v4', contact: byId('c3'), endpoint: endpoints[1], queueId: 'q3', assigneeId: 'u3', participantIds: ['u1'],
    status: 'in_progress', botPaused: true, tags: [tags.financeiro], unreadCount: 0, contactTyping: false,
    lastMessage: { preview: 'O QR code do Pix não está funcionando', contentType: 'text', direction: 'outbound', deliveryStatus: 'read', at: minutesAgo(58) },
    windowExpiresAt: minutesFromNow(60 * 22),
  },
  {
    id: 'v5', contact: byId('c5'), endpoint: endpoints[0], queueId: 'q2', assigneeId: 'u2', participantIds: [],
    status: 'resolved', botPaused: true, tags: [], unreadCount: 0, contactTyping: false,
    lastMessage: { preview: 'Obrigado! Já saiu para entrega, aguardo', contentType: 'text', direction: 'inbound', at: minutesAgo(60 * 20) },
  },
  {
    id: 'v6', contact: byId('c6'), endpoint: endpoints[0], participantIds: [],
    status: 'new', botPaused: false, tags: [], unreadCount: 1, contactTyping: false,
    lastMessage: { preview: 'Olá, bom dia! Queria saber sobre frete', contentType: 'text', direction: 'inbound', at: minutesAgo(4) },
    windowExpiresAt: minutesFromNow(60 * 24 - 4),
  },
  {
    id: 'v7', contact: byId('c7'), endpoint: endpoints[1], queueId: 'q1', participantIds: [],
    status: 'queued', botPaused: true, tags: [], unreadCount: 3, contactTyping: false,
    lastMessage: { preview: 'Preciso falar com um atendente', contentType: 'text', direction: 'inbound', at: minutesAgo(12) },
    windowExpiresAt: minutesFromNow(60 * 23), slaDueAt: minutesFromNow(3),
  },
];

export const messages: Message[] = [
  // v2 — conversa principal de demonstração
  { id: 'm1', conversationId: 'v2', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'Bom dia, Ana! Tudo bem?', createdAt: minutesAgo(40) },
  { id: 'm2', conversationId: 'v2', direction: 'outbound', senderType: 'bot', contentType: 'text', body: 'Olá, Marcos! Vou te direcionar para o time Comercial. 👋', deliveryStatus: 'read', createdAt: minutesAgo(39) },
  { id: 'm3', conversationId: 'v2', direction: 'internal', senderType: 'system', contentType: 'text', body: 'Conversa atribuída a Ana Souza na fila Comercial', createdAt: minutesAgo(39) },
  { id: 'm4', conversationId: 'v2', direction: 'outbound', senderType: 'user', senderUserId: 'u1', contentType: 'text', body: 'Bom dia, Marcos! Tudo ótimo por aqui, e com você? 😊', deliveryStatus: 'read', createdAt: minutesAgo(35) },
  { id: 'm5', conversationId: 'v2', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'Preciso fechar a coleta de amanhã. São 12 paletes saindo de Contagem-MG para Recife-PE.', createdAt: minutesAgo(34) },
  { id: 'm6', conversationId: 'v2', direction: 'inbound', senderType: 'contact', contentType: 'image', mediaUrl: '/mock/carga.svg', forwarded: true, createdAt: minutesAgo(33) },
  { id: 'm7', conversationId: 'v2', direction: 'internal', senderType: 'user', senderUserId: 'u1', contentType: 'text', body: '@Bruno consegue confirmar disponibilidade de carreta para amanhã?', createdAt: minutesAgo(20) },
  { id: 'm8', conversationId: 'v2', direction: 'outbound', senderType: 'user', senderUserId: 'u2', contentType: 'text', body: 'Recebi a foto 👍 Vou gerar o CT-e e te mando o número de rastreio assim que o motorista confirmar.', replyTo: { authorName: 'Marcos Pereira', preview: 'Imagem', contentType: 'image' }, deliveryStatus: 'delivered', createdAt: minutesAgo(8) },
  { id: 'm9', conversationId: 'v2', direction: 'inbound', senderType: 'contact', contentType: 'image', mediaUrl: '/mock/carga.svg', createdAt: minutesAgo(3) },

  { id: 'm10', conversationId: 'v1', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'Oi! Vocês fazem coleta em Curitiba?', createdAt: minutesAgo(15) },
  { id: 'm11', conversationId: 'v1', direction: 'outbound', senderType: 'user', senderUserId: 'u1', contentType: 'text', body: 'Fazemos sim, Fernanda! Qual o volume e a data?', deliveryStatus: 'read', createdAt: minutesAgo(10) },
  { id: 'm12', conversationId: 'v1', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'São 4 volumes, uns 300 kg.', createdAt: minutesAgo(1) },
  { id: 'm13', conversationId: 'v1', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'Consigo agendar para quinta?', createdAt: minutesAgo(0) },

  { id: 'm14', conversationId: 'v3', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'A carga chegou com duas caixas amassadas.', createdAt: minutesAgo(30) },
  { id: 'm15', conversationId: 'v3', direction: 'outbound', senderType: 'user', senderUserId: 'u1', contentType: 'text', body: 'Sinto muito, Juliana. Pode me enviar fotos das caixas e da nota fiscal?', deliveryStatus: 'read', createdAt: minutesAgo(25) },

  { id: 'm16', conversationId: 'v4', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'O QR code do Pix não está funcionando', createdAt: minutesAgo(60) },
  { id: 'm17', conversationId: 'v4', direction: 'outbound', senderType: 'user', senderUserId: 'u3', contentType: 'text', body: 'Vou gerar um novo para você, Pedro.', deliveryStatus: 'read', createdAt: minutesAgo(58) },

  { id: 'm18', conversationId: 'v5', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'Obrigado! Já saiu para entrega, aguardo', createdAt: minutesAgo(60 * 20) },
  { id: 'm19', conversationId: 'v6', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'Olá, bom dia! Queria saber sobre frete', createdAt: minutesAgo(4) },
  { id: 'm20', conversationId: 'v6', direction: 'outbound', senderType: 'bot', contentType: 'text', body: 'Olá! Para te direcionar ao especialista certo, me conta: qual é o seu nome?', deliveryStatus: 'delivered', createdAt: minutesAgo(4) },
  { id: 'm21', conversationId: 'v7', direction: 'inbound', senderType: 'contact', contentType: 'text', body: 'Preciso falar com um atendente', createdAt: minutesAgo(12) },
];

export const tickets: Ticket[] = [
  { id: 'k1', protocol: '2026101700001', subject: 'Coleta de 12 paletes Contagem → Recife', contactId: 'c1', conversationId: 'v2', assigneeId: 'u1', priority: 'high', status: 'in_progress', createdAt: minutesAgo(38) },
  { id: 'k2', protocol: '2026101700002', subject: 'Avaria na mercadoria recebida', contactId: 'c2', conversationId: 'v3', assigneeId: 'u1', priority: 'urgent', status: 'waiting', createdAt: minutesAgo(29) },
  { id: 'k3', protocol: '2026101600014', subject: 'Segunda via de boleto', contactId: 'c3', assigneeId: 'u3', priority: 'low', status: 'resolved', createdAt: minutesAgo(60 * 26) },
  { id: 'k4', protocol: '2026100900007', subject: 'Cotação de frete fracionado', contactId: 'c1', assigneeId: 'u2', priority: 'normal', status: 'closed', createdAt: minutesAgo(60 * 24 * 8) },
];
