// Dados fictícios para descoberta de produto. Nomes, telefones, documentos e empresas são
// inventados — nunca usar dados reais de clientes aqui (o repositório é público).
import type {
  ChannelEndpoint,
  ChannelEndpointRef,
  Organization,
  OrganizationRef,
  Contact,
  Conversation,
  Message,
  OperationalQueue,
  QuickReply,
  Role,
  Tag,
  Ticket,
  TicketEvent,
  User,
} from '../domain/types';
import type { AiPolicy, KnowledgeSource } from '../domain/ai';
import type { AuditEvent } from '../domain/audit';
import type { Integration, IntegrationRun } from '../domain/integration';
import type { Workflow, WorkflowDefinition } from '../domain/workflow';
import { templateDefinition } from '../domain/workflowTemplates';

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();
const minutesFromNow = (m: number) => minutesAgo(-m);

export const roles: Role[] = [
  {
    id: 'r-admin',
    name: 'Administrador',
    description: 'Acesso total, inclusive usuários, papéis e configurações.',
    permissions: [
      'conversations.view_all', 'conversations.take_over', 'conversations.reply', 'conversations.transfer', 'tickets.view', 'tickets.manage',
      'contacts.view', 'contacts.edit', 'settings.queues', 'settings.quick_replies', 'settings.users', 'settings.channels',
      'settings.integrations', 'settings.knowledge', 'settings.ai', 'settings.audit', 'workflows.manage',
    ],
    system: true,
  },
  {
    id: 'r-supervisor',
    name: 'Supervisor',
    description: 'Acompanha todos os atendimentos e cuida das filas e respostas rápidas.',
    permissions: [
      'conversations.view_all', 'conversations.take_over', 'conversations.reply', 'conversations.transfer', 'tickets.view', 'tickets.manage',
      'contacts.view', 'contacts.edit', 'settings.queues', 'settings.quick_replies', 'workflows.manage',
    ],
    system: false,
  },
  {
    id: 'r-agent',
    name: 'Atendente',
    description: 'Atende as conversas das suas filas e cuida dos próprios tickets.',
    permissions: ['conversations.reply', 'conversations.transfer', 'tickets.view', 'tickets.manage', 'contacts.view'],
    system: false,
  },
];

// Conta usada pelo time para entrar no console durante a descoberta. O atalho da tela de login
// (só em desenvolvimento) preenche estas credenciais. A senha é fictícia: o servidor em memória
// aceita qualquer senha com 4+ caracteres.
export const demoAccess = { email: 'felipy@exemplo.com', password: 'andon2026' };

export const users: User[] = [
  {
    id: 'u0', name: 'Felipy Aguiar', email: demoAccess.email, roleId: 'r-admin', status: 'active',
    availability: 'available', lastSeenAt: minutesAgo(0),
  },
  { id: 'u1', name: 'Ana Souza', email: 'ana@exemplo.com', roleId: 'r-admin', status: 'active', availability: 'available', lastSeenAt: minutesAgo(0) },
  { id: 'u2', name: 'Bruno Lima', email: 'bruno@exemplo.com', roleId: 'r-agent', status: 'active', availability: 'available', lastSeenAt: minutesAgo(3) },
  { id: 'u3', name: 'Carla Mendes', email: 'carla@exemplo.com', roleId: 'r-supervisor', status: 'active', availability: 'offline', lastSeenAt: minutesAgo(60 * 15) },
  { id: 'u4', name: 'Diego Rocha', email: 'diego@exemplo.com', roleId: 'r-agent', status: 'active', availability: 'paused', pauseReason: 'Almoço', lastSeenAt: minutesAgo(25) },
  {
    id: 'u5', name: 'Elisa Martins', email: 'elisa@exemplo.com', roleId: 'r-agent', status: 'invited', availability: 'offline',
    invite: { token: 'demo-convite-elisa', expiresAt: minutesFromNow(60 * 24 * 6), invitedBy: 'u1', sentAt: minutesAgo(60 * 24) },
  },
  { id: 'u6', name: 'Fábio Teixeira', email: 'fabio@exemplo.com', roleId: 'r-agent', status: 'disabled', availability: 'offline', lastSeenAt: minutesAgo(60 * 24 * 40) },
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

// Host fictício: a URL real do webhook vem do back-end, que conhece o domínio do ambiente.
export const webhookHost = 'https://api.exemplo.com.br';

export const endpoints: ChannelEndpoint[] = [
  {
    id: 'e1', channelType: 'whatsapp', name: 'WhatsApp Principal', address: '+55 11 90000-0001', status: 'connected',
    whatsapp: {
      wabaId: '100000000000001', phoneNumberId: '200000000000001', verifiedName: 'Empresa Exemplo',
      tokenHint: '••••4f21', webhookUrl: `${webhookHost}/webhooks/whatsapp/e1`, webhookVerifyToken: 'verif-exemplo-principal',
      quality: 'green', tier: '1k', lastCheckedAt: minutesAgo(4),
    },
  },
  {
    id: 'e2', channelType: 'whatsapp', name: 'WhatsApp Comercial', address: '+55 11 90000-0002', status: 'connected',
    whatsapp: {
      wabaId: '100000000000001', phoneNumberId: '200000000000002', verifiedName: 'Empresa Exemplo Vendas',
      tokenHint: '••••9c07', webhookUrl: `${webhookHost}/webhooks/whatsapp/e2`, webhookVerifyToken: 'verif-exemplo-comercial',
      quality: 'yellow', tier: '250', lastCheckedAt: minutesAgo(11),
    },
  },
  {
    id: 'e3', channelType: 'whatsapp', name: 'WhatsApp Suporte', address: '+55 11 90000-0003', status: 'pending',
    whatsapp: {
      wabaId: '100000000000001', phoneNumberId: '200000000000003', verifiedName: 'Empresa Exemplo Suporte',
      tokenHint: '••••1b55', webhookUrl: `${webhookHost}/webhooks/whatsapp/e3`, webhookVerifyToken: 'verif-exemplo-suporte',
    },
  },
];

export const queues: OperationalQueue[] = [
  { id: 'q1', name: 'Comercial', color: 'green', routingPolicy: 'round_robin', memberIds: ['u0', 'u1', 'u2', 'u4'], endpointIds: ['e1', 'e2'], isDefault: true },
  { id: 'q2', name: 'Suporte', color: 'blue', routingPolicy: 'round_robin', memberIds: ['u0', 'u1', 'u3'], endpointIds: ['e1'], isDefault: false },
  { id: 'q3', name: 'Financeiro', color: 'purple', routingPolicy: 'manual', memberIds: ['u3'], endpointIds: ['e2'], isDefault: false },
];

export const organizations: Organization[] = [
  { id: 'o1', name: 'Transportes Exemplo', cnpj: '00.000.000/0001-91', domain: 'transportesexemplo.com.br', createdAt: minutesAgo(60 * 24 * 60) },
  { id: 'o2', name: 'Farma Fictícia', domain: 'farmaficticia.com.br', createdAt: minutesAgo(60 * 24 * 30) },
  { id: 'o3', name: 'Grupo Modelo', createdAt: minutesAgo(60 * 24 * 20) },
  { id: 'o4', name: 'Móveis Demonstração', createdAt: minutesAgo(60 * 24 * 9) },
  { id: 'o5', name: 'Alimentos Teste', createdAt: minutesAgo(60 * 24 * 4) },
  { id: 'o6', name: 'Distribuidora Amostra', notes: 'Compra por cotação, sempre pede prazo.', createdAt: minutesAgo(60 * 24 * 2) },
];

const org = (id: string): OrganizationRef => {
  const found = organizations.find((o) => o.id === id)!;
  return { id: found.id, name: found.name };
};

export const contacts: Contact[] = [
  { id: 'c1', code: '1000101', name: 'Marcos Pereira', phone: '+55 11 91234-0001', email: 'marcos@transportesexemplo.com.br', jobTitle: 'Gerente de Logística', organization: org('o1'), cpf: '000.000.001-91', cnpj: '00.000.000/0001-91', tags: [tags.cotacao, tags.vip], createdAt: minutesAgo(60 * 24 * 40) },
  { id: 'c2', code: '1000102', name: 'Juliana Rocha', phone: '+55 21 91234-0002', email: 'juliana@farmaficticia.com.br', jobTitle: 'Compradora', organization: org('o2'), tags: [tags.sinistro, tags.avaria], createdAt: minutesAgo(60 * 24 * 12) },
  { id: 'c3', code: '1000103', name: 'Pedro Alves', phone: '+55 31 91234-0003', organization: org('o3'), tags: [tags.financeiro], createdAt: minutesAgo(60 * 24 * 3) },
  { id: 'c4', code: '1000104', name: 'Fernanda Dias', phone: '+55 41 91234-0004', organization: org('o4'), tags: [tags.cotacao, tags.coleta], createdAt: minutesAgo(60 * 5) },
  { id: 'c5', code: '1000105', name: 'Rafael Nunes', phone: '+55 51 91234-0005', organization: org('o5'), tags: [], createdAt: minutesAgo(60 * 30) },
  { id: 'c6', code: '1000106', name: '+55 61 91234-0006', phone: '+55 61 91234-0006', tags: [], createdAt: minutesAgo(4) },
  { id: 'c7', code: '1000107', name: 'Luana Castro', phone: '+55 71 91234-0007', organization: org('o6'), tags: [], createdAt: minutesAgo(60 * 3) },
];

const byId = (id: string) => contacts.find((c) => c.id === id)!;

// Projeta o endpoint no formato que a conversa carrega: sem token, webhook ou estado da conexão.
const ref = (endpoint: ChannelEndpoint): ChannelEndpointRef => ({
  id: endpoint.id,
  channelType: endpoint.channelType,
  name: endpoint.name,
  address: endpoint.address,
});

export const conversations: Conversation[] = [
  {
    id: 'v1', contact: byId('c4'), endpoint: ref(endpoints[0]), queueId: 'q1', assigneeId: 'u1', participantIds: [],
    status: 'in_progress', botPaused: true, tags: [tags.cotacao, tags.coleta], unreadCount: 2, contactTyping: true,
    lastMessage: { preview: 'Consigo agendar para quinta?', contentType: 'text', direction: 'inbound', at: minutesAgo(0) },
    windowExpiresAt: minutesFromNow(60 * 23 + 50), autoResolveAt: minutesFromNow(60 * 6),
  },
  {
    id: 'v2', contact: byId('c1'), endpoint: ref(endpoints[0]), queueId: 'q1', assigneeId: 'u1', participantIds: ['u2'],
    status: 'in_progress', botPaused: true, tags: [tags.cotacao], unreadCount: 1, contactTyping: false,
    lastMessage: { preview: 'Imagem', contentType: 'image', direction: 'inbound', at: minutesAgo(3) },
    windowExpiresAt: minutesFromNow(60 * 4 + 22), autoResolveAt: minutesFromNow(5 * 60 + 59), slaDueAt: minutesAgo(3), ticketId: 'k1',
  },
  {
    id: 'v3', contact: byId('c2'), endpoint: ref(endpoints[0]), queueId: 'q2', assigneeId: 'u1', participantIds: [],
    status: 'waiting_customer', botPaused: true, tags: [tags.sinistro, tags.avaria], unreadCount: 0, contactTyping: false,
    lastMessage: { preview: 'Meu cliente reclamou que a carga chegou com avaria', contentType: 'text', direction: 'outbound', deliveryStatus: 'read', at: minutesAgo(25) },
    windowExpiresAt: minutesFromNow(60 * 20), ticketId: 'k2',
  },
  {
    id: 'v4', contact: byId('c3'), endpoint: ref(endpoints[1]), queueId: 'q3', assigneeId: 'u3', participantIds: ['u1'],
    status: 'in_progress', botPaused: true, tags: [tags.financeiro], unreadCount: 0, contactTyping: false,
    lastMessage: { preview: 'O QR code do Pix não está funcionando', contentType: 'text', direction: 'outbound', deliveryStatus: 'read', at: minutesAgo(58) },
    windowExpiresAt: minutesFromNow(60 * 22),
  },
  {
    id: 'v5', contact: byId('c5'), endpoint: ref(endpoints[0]), queueId: 'q2', assigneeId: 'u2', participantIds: [],
    status: 'resolved', botPaused: true, tags: [], unreadCount: 0, contactTyping: false,
    lastMessage: { preview: 'Obrigado! Já saiu para entrega, aguardo', contentType: 'text', direction: 'inbound', at: minutesAgo(60 * 20) },
  },
  {
    id: 'v6', contact: byId('c6'), endpoint: ref(endpoints[0]), participantIds: [],
    status: 'new', botPaused: false, tags: [], unreadCount: 1, contactTyping: false,
    lastMessage: { preview: 'Olá, bom dia! Queria saber sobre frete', contentType: 'text', direction: 'inbound', at: minutesAgo(4) },
    windowExpiresAt: minutesFromNow(60 * 24 - 4),
  },
  {
    id: 'v7', contact: byId('c7'), endpoint: ref(endpoints[1]), queueId: 'q1', participantIds: [],
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
  { id: 'k1', protocol: '2026101700001', subject: 'Coleta de 12 paletes Contagem → Recife', description: 'Cliente precisa da coleta amanhã. Confirmar carreta e gerar CT-e.', contactId: 'c1', conversationId: 'v2', assigneeId: 'u1', priority: 'high', status: 'in_progress', createdAt: minutesAgo(38), updatedAt: minutesAgo(20) },
  { id: 'k2', protocol: '2026101700002', subject: 'Avaria na mercadoria recebida', description: 'Duas caixas chegaram amassadas. Aguardando fotos e nota fiscal.', contactId: 'c2', conversationId: 'v3', assigneeId: 'u1', priority: 'urgent', status: 'waiting', createdAt: minutesAgo(29), updatedAt: minutesAgo(25) },
  { id: 'k3', protocol: '2026101600014', subject: 'Segunda via de boleto', contactId: 'c3', assigneeId: 'u3', priority: 'low', status: 'resolved', createdAt: minutesAgo(60 * 26), updatedAt: minutesAgo(60 * 25) },
  { id: 'k4', protocol: '2026100900007', subject: 'Cotação de frete fracionado', contactId: 'c1', assigneeId: 'u2', priority: 'normal', status: 'closed', createdAt: minutesAgo(60 * 24 * 8), updatedAt: minutesAgo(60 * 24 * 7) },
];

export const ticketEvents: TicketEvent[] = [
  { id: 'te1', ticketId: 'k1', type: 'created', actorUserId: 'u1', createdAt: minutesAgo(38) },
  { id: 'te2', ticketId: 'k1', type: 'status_changed', actorUserId: 'u1', from: 'open', to: 'in_progress', createdAt: minutesAgo(36) },
  { id: 'te3', ticketId: 'k1', type: 'comment', actorUserId: 'u2', body: 'Carreta confirmada para amanhã às 8h.', createdAt: minutesAgo(20) },
  { id: 'te4', ticketId: 'k2', type: 'created', actorUserId: 'u1', createdAt: minutesAgo(29) },
  { id: 'te5', ticketId: 'k2', type: 'priority_changed', actorUserId: 'u1', from: 'high', to: 'urgent', createdAt: minutesAgo(28) },
  { id: 'te6', ticketId: 'k2', type: 'status_changed', actorUserId: 'u1', from: 'open', to: 'waiting', createdAt: minutesAgo(25) },
  { id: 'te7', ticketId: 'k3', type: 'created', actorUserId: 'u3', createdAt: minutesAgo(60 * 26) },
  { id: 'te8', ticketId: 'k3', type: 'status_changed', actorUserId: 'u3', from: 'open', to: 'resolved', createdAt: minutesAgo(60 * 25) },
  { id: 'te9', ticketId: 'k4', type: 'created', actorUserId: 'u2', createdAt: minutesAgo(60 * 24 * 8) },
  { id: 'te10', ticketId: 'k4', type: 'status_changed', actorUserId: 'u2', from: 'open', to: 'closed', createdAt: minutesAgo(60 * 24 * 7) },
];

export const integrations: Integration[] = [
  {
    id: 'i1',
    name: 'ERP — Pedidos',
    description: 'Consulta de pedidos e notas para responder status ao cliente.',
    baseUrl: 'https://erp.exemplo.com.br/api/v1',
    auth: { kind: 'bearer', secretHint: '••••7d3a' },
    headers: [{ name: 'Accept', value: 'application/json' }],
    operations: [
      { id: 'i1-op1', name: 'Consultar pedido por CPF', method: 'GET', path: '/pedidos?cpf={{contato.cpf}}' },
      { id: 'i1-op2', name: 'Consultar rastreio', method: 'GET', path: '/pedidos/{{pedido.numero}}/rastreio' },
    ],
    timeoutMs: 5000,
    retry: { attempts: 3, backoffSeconds: 10 },
    status: 'active',
    createdAt: minutesAgo(60 * 24 * 30),
  },
  {
    id: 'i2',
    name: 'Transportadora — Coletas',
    description: 'Agenda coleta e devolve a janela confirmada.',
    baseUrl: 'https://coletas.exemplo.com.br',
    auth: { kind: 'api_key', headerName: 'X-API-Key', secretHint: '••••b014' },
    headers: [],
    operations: [
      {
        id: 'i2-op1',
        name: 'Agendar coleta',
        method: 'POST',
        path: '/v2/coletas',
        body: '{ "cliente": "{{contato.nome}}", "data": "{{opcao}}" }',
      },
    ],
    timeoutMs: 8000,
    retry: { attempts: 2, backoffSeconds: 30 },
    status: 'active',
    createdAt: minutesAgo(60 * 24 * 12),
  },
  {
    id: 'i3',
    name: 'CRM antigo',
    description: 'Mantida só para consulta histórica durante a migração.',
    baseUrl: 'https://crm-legado.exemplo.com.br',
    auth: { kind: 'basic', username: 'andon', secretHint: '••••11f9' },
    headers: [],
    operations: [{ id: 'i3-op1', name: 'Buscar cliente', method: 'GET', path: '/clientes/busca?termo={{mensagem}}' }],
    timeoutMs: 3000,
    retry: { attempts: 1, backoffSeconds: 0 },
    status: 'disabled',
    createdAt: minutesAgo(60 * 24 * 90),
  },
];

export const integrationRuns: IntegrationRun[] = [
  { id: 'r1', integrationId: 'i1', operationName: 'Consultar pedido por CPF', method: 'GET', url: 'https://erp.exemplo.com.br/api/v1/pedidos?cpf=000.000.001-91', status: 'success', httpStatus: 200, durationMs: 412, attempts: 1, source: { kind: 'workflow', workflowName: 'Status de pedido' }, at: minutesAgo(3) },
  { id: 'r2', integrationId: 'i1', operationName: 'Consultar rastreio', method: 'GET', url: 'https://erp.exemplo.com.br/api/v1/pedidos/99812/rastreio', status: 'success', httpStatus: 200, durationMs: 1183, attempts: 2, source: { kind: 'workflow', workflowName: 'Status de pedido' }, at: minutesAgo(19) },
  { id: 'r3', integrationId: 'i2', operationName: 'Agendar coleta', method: 'POST', url: 'https://coletas.exemplo.com.br/v2/coletas', status: 'failed', httpStatus: 503, durationMs: 8000, attempts: 2, error: 'Tempo esgotado após 2 tentativas (503 Service Unavailable).', source: { kind: 'workflow', workflowName: 'Triagem inicial' }, at: minutesAgo(42) },
  { id: 'r4', integrationId: 'i1', operationName: 'Consultar pedido por CPF', method: 'GET', url: 'https://erp.exemplo.com.br/api/v1/pedidos?cpf=000.000.002-10', status: 'success', httpStatus: 200, durationMs: 332, attempts: 1, source: { kind: 'manual' }, at: minutesAgo(60 * 5) },
  { id: 'r5', integrationId: 'i1', operationName: 'Consultar pedido por CPF', method: 'GET', url: 'https://erp.exemplo.com.br/api/v1/pedidos?cpf=vazio', status: 'failed', httpStatus: 404, durationMs: 289, attempts: 1, error: 'Pedido não encontrado para o CPF informado.', source: { kind: 'workflow', workflowName: 'Status de pedido' }, at: minutesAgo(60 * 9) },
  { id: 'r6', integrationId: 'i3', operationName: 'Buscar cliente', method: 'GET', url: 'https://crm-legado.exemplo.com.br/clientes/busca?termo=teste', status: 'failed', durationMs: 3000, attempts: 1, error: 'Integração desativada: a chamada não foi enviada.', source: { kind: 'manual' }, at: minutesAgo(60 * 30) },
];

export const knowledgeSources: KnowledgeSource[] = [
  {
    id: 'k1',
    name: 'Prazos de entrega por região',
    kind: 'text',
    content:
      'Sudeste: 2 a 4 dias úteis. Sul: 3 a 5 dias úteis. Centro-Oeste: 4 a 6 dias úteis. ' +
      'Nordeste: 5 a 8 dias úteis. Norte: 7 a 12 dias úteis. Prazos contam do faturamento, não do pedido.',
    status: 'indexed',
    chunks: 4,
    lastIndexedAt: minutesAgo(60 * 24 * 2),
    createdAt: minutesAgo(60 * 24 * 20),
  },
  {
    id: 'k2',
    name: 'Política de avarias e sinistro',
    kind: 'pdf',
    origin: 'politica-avarias-v3.pdf',
    status: 'indexed',
    chunks: 27,
    lastIndexedAt: minutesAgo(60 * 24 * 5),
    createdAt: minutesAgo(60 * 24 * 45),
  },
  {
    id: 'k3',
    name: 'Perguntas frequentes do site',
    kind: 'url',
    origin: 'https://www.exemplo.com.br/ajuda/faq',
    status: 'indexed',
    chunks: 52,
    lastIndexedAt: minutesAgo(90),
    createdAt: minutesAgo(60 * 24 * 10),
  },
  {
    id: 'k4',
    name: 'Tabela de frete 2026',
    kind: 'pdf',
    origin: 'tabela-frete-2026.pdf',
    status: 'indexing',
    chunks: 0,
    createdAt: minutesAgo(2),
  },
  {
    id: 'k5',
    name: 'Manual do sistema antigo',
    kind: 'url',
    origin: 'https://intranet.exemplo.com.br/manual',
    status: 'error',
    chunks: 0,
    error: 'A página respondeu 403: a intranet exige login.',
    createdAt: minutesAgo(60 * 24 * 3),
  },
];

export const aiPolicy: AiPolicy = {
  autonomy: 'reply',
  sourceIds: ['k1', 'k2', 'k3'],
  requireCitation: true,
  maxRepliesBeforeHandoff: 3,
  handoffQueueId: 'q2',
  blockedTopics: ['cancelamento de contrato', 'reclamação formal', 'valores de indenização'],
};

export const auditEvents: AuditEvent[] = [
  {
    id: 'a1', at: minutesAgo(8), actorUserId: 'u1', action: 'published', entityType: 'workflow', entityId: 'w1',
    entityLabel: 'Status de pedido', summary: 'Publicou a versão 4', changes: [{ field: 'Versão publicada', from: '3', to: '4' }],
  },
  {
    id: 'a2', at: minutesAgo(54), actorUserId: 'u1', action: 'updated', entityType: 'ai_policy',
    entityLabel: 'Política da IA', summary: 'Alterou a autonomia da IA',
    changes: [{ field: 'Autonomia', from: 'suggest', to: 'reply' }, { field: 'Exigir citação', from: 'não', to: 'sim' }],
  },
  {
    id: 'a3', at: minutesAgo(60 * 3), actorUserId: 'u3', action: 'disabled', entityType: 'integration', entityId: 'i3',
    entityLabel: 'CRM antigo', summary: 'Desativou a integração', changes: [{ field: 'Estado', from: 'active', to: 'disabled' }],
  },
  {
    id: 'a4', at: minutesAgo(60 * 20), actorUserId: 'u1', action: 'invited', entityType: 'user', entityId: 'u5',
    entityLabel: 'elisa@exemplo.com', summary: 'Convidou para a empresa como Atendente', changes: [],
  },
  {
    id: 'a5', at: minutesAgo(60 * 26), action: 'reindexed', entityType: 'knowledge_source', entityId: 'k3',
    entityLabel: 'Perguntas frequentes do site', summary: 'Reindexação automática concluída',
    changes: [{ field: 'Fragmentos', from: '48', to: '52' }],
  },
];

export const quickReplies: QuickReply[] = [
  { id: 'r1', shortcut: 'saudacao', title: 'Saudação', body: 'Olá, {{nome}}! Tudo bem? Sou da equipe de atendimento e vou te ajudar por aqui.' },
  { id: 'r2', shortcut: 'aguarde', title: 'Pedir um momento', body: '{{nome}}, só um instante enquanto verifico isso para você.' },
  { id: 'r3', shortcut: 'coleta', title: 'Dados para coleta', body: 'Para agendar a coleta, me envie: endereço completo, quantidade de volumes, peso aproximado e data desejada.' },
  { id: 'r4', shortcut: 'nf', title: 'Solicitar nota fiscal', body: 'Pode me enviar a nota fiscal da mercadoria (PDF ou foto legível)?' },
  { id: 'r5', shortcut: 'encerrar', title: 'Encerramento', body: 'Fico à disposição, {{nome}}! Se precisar de algo, é só chamar por aqui.' },
];

// Workflows de exemplo: um publicado com rascunho alterado (mostra "alterações não publicadas")
// e um publicado e pausado.
const triageV1 = templateDefinition('triage');
const triageDraft: WorkflowDefinition = structuredClone(triageV1);
(triageDraft.nodes[1].config as { text: string }).text =
  'Olá, {{contato.nome}}! 👋 Sou o assistente virtual da Empresa Exemplo. Atendemos de segunda a sexta, das 8h às 18h.';
const orderV1 = templateDefinition('order_status');

export const workflows: Workflow[] = [
  {
    id: 'w1',
    name: 'Triagem de boas-vindas',
    description: 'Cumprimenta e direciona para Comercial, Suporte ou Financeiro.',
    draft: triageDraft,
    draftUpdatedAt: minutesAgo(40),
    draftUpdatedBy: 'u3',
    versions: [
      { id: 'w1v1', number: 1, definition: triageV1, note: 'Primeira versão', publishedBy: 'u1', publishedAt: minutesAgo(60 * 24 * 9) },
      { id: 'w1v2', number: 2, definition: triageV1, note: 'Ajuste no texto da opção de pedidos', publishedBy: 'u3', publishedAt: minutesAgo(60 * 24 * 2) },
    ],
    publishedVersionId: 'w1v2',
    status: 'active',
    pauseAi: true,
    stats: { runs24h: 128, failures24h: 0 },
    createdAt: minutesAgo(60 * 24 * 9),
  },
  {
    id: 'w2',
    name: 'Status do pedido',
    description: 'Consulta o ERP quando o cliente fala de pedido ou entrega.',
    draft: orderV1,
    draftUpdatedAt: minutesAgo(60 * 24 * 5),
    draftUpdatedBy: 'u1',
    versions: [{ id: 'w2v1', number: 1, definition: orderV1, note: 'Integração com o ERP (simulada)', publishedBy: 'u1', publishedAt: minutesAgo(60 * 24 * 5) }],
    publishedVersionId: 'w2v1',
    status: 'paused',
    pauseAi: true,
    stats: { runs24h: 0, failures24h: 0 },
    createdAt: minutesAgo(60 * 24 * 5),
  },
];
