import type { AiAutonomy, SourceKind, SourceStatus } from './ai';
import type { AuditAction, AuditEntityType } from './audit';
import type { IntegrationAuthKind, IntegrationRunStatus, IntegrationStatus } from './integration';
import type { Availability, ChannelStatus, ConversationStatus, MessagingTier, Permission, QualityRating, TicketPriority, TicketStatus, UserStatus } from './types';

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const conversationStatus: Record<ConversationStatus, { label: string; tone: Tone }> = {
  new: { label: 'Nova', tone: 'info' },
  queued: { label: 'Na fila', tone: 'warning' },
  in_progress: { label: 'Em atendimento', tone: 'success' },
  waiting_customer: { label: 'Aguardando cliente', tone: 'neutral' },
  waiting_internal: { label: 'Aguardando ação interna', tone: 'warning' },
  resolved: { label: 'Resolvida', tone: 'success' },
  closed: { label: 'Encerrada', tone: 'neutral' },
};

export const ticketStatus: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Aberto', tone: 'info' },
  in_progress: { label: 'Em andamento', tone: 'success' },
  waiting: { label: 'Aguardando', tone: 'warning' },
  resolved: { label: 'Resolvido', tone: 'success' },
  closed: { label: 'Fechado', tone: 'neutral' },
};

export const ticketPriority: Record<TicketPriority, { label: string; tone: Tone }> = {
  low: { label: 'Baixa', tone: 'neutral' },
  normal: { label: 'Normal', tone: 'info' },
  high: { label: 'Alta', tone: 'warning' },
  urgent: { label: 'Urgente', tone: 'danger' },
};

export const availability: Record<Availability, { label: string; description: string }> = {
  available: { label: 'Disponível', description: 'Recebe novos atendimentos pelo rodízio' },
  paused: { label: 'Em pausa', description: 'Não recebe novos atendimentos' },
  offline: { label: 'Ausente', description: 'Fora do expediente' },
};

export const pauseReasons = ['Almoço', 'Reunião', 'Intervalo', 'Treinamento'];

export const channelStatus: Record<ChannelStatus, { label: string; tone: Tone; description: string }> = {
  connected: { label: 'Conectado', tone: 'success', description: 'Recebendo e enviando mensagens.' },
  pending: { label: 'Aguardando verificação', tone: 'warning', description: 'Falta confirmar o webhook no painel da Meta.' },
  error: { label: 'Com erro', tone: 'danger', description: 'A Meta recusou a última chamada. Verifique as credenciais.' },
  disabled: { label: 'Desconectado', tone: 'neutral', description: 'Não recebe nem envia. O histórico é mantido.' },
};

export const qualityRating: Record<QualityRating, { label: string; tone: Tone }> = {
  green: { label: 'Alta', tone: 'success' },
  yellow: { label: 'Média', tone: 'warning' },
  red: { label: 'Baixa', tone: 'danger' },
};

// Limite de conversas iniciadas pela empresa em 24h, definido pela Meta.
export const messagingTier: Record<MessagingTier, string> = {
  '250': '250 conversas/dia',
  '1k': '1.000 conversas/dia',
  '10k': '10.000 conversas/dia',
  '100k': '100.000 conversas/dia',
  unlimited: 'Sem limite',
};

export const integrationStatus: Record<IntegrationStatus, { label: string; tone: Tone; description: string }> = {
  active: { label: 'Ativa', tone: 'success', description: 'Os workflows podem chamar esta integração.' },
  disabled: { label: 'Desativada', tone: 'neutral', description: 'As chamadas falham de imediato, sem tentar a rede.' },
};

export const integrationAuth: Record<IntegrationAuthKind, { label: string; description: string }> = {
  none: { label: 'Sem autenticação', description: 'API pública ou liberada por rede.' },
  bearer: { label: 'Token (Bearer)', description: 'Enviado em Authorization: Bearer <token>.' },
  api_key: { label: 'Chave em cabeçalho', description: 'Enviada no cabeçalho que você indicar.' },
  basic: { label: 'Usuário e senha (Basic)', description: 'Enviado em Authorization: Basic <base64>.' },
};

export const integrationRunStatus: Record<IntegrationRunStatus, { label: string; tone: Tone }> = {
  success: { label: 'Sucesso', tone: 'success' },
  failed: { label: 'Falha', tone: 'danger' },
};

export const sourceStatus: Record<SourceStatus, { label: string; tone: Tone; description: string }> = {
  indexed: { label: 'Indexada', tone: 'success', description: 'Disponível para a IA citar.' },
  indexing: { label: 'Indexando', tone: 'info', description: 'Ainda não pode ser citada.' },
  error: { label: 'Com erro', tone: 'danger', description: 'Não foi possível ler o conteúdo.' },
};

export const sourceKind: Record<SourceKind, { label: string; description: string }> = {
  url: { label: 'Página web', description: 'O conteúdo é lido do endereço e reindexado periodicamente.' },
  pdf: { label: 'Documento PDF', description: 'Arquivo enviado pela equipe.' },
  text: { label: 'Texto interno', description: 'Escrito direto aqui — bom para política e procedimento.' },
};

// Autonomia crescente: cada nível acrescenta ao anterior.
export const aiAutonomy: Record<AiAutonomy, { label: string; description: string; tone: Tone }> = {
  off: { label: 'Desligada', description: 'A IA não participa. Todo atendimento é humano.', tone: 'neutral' },
  suggest: {
    label: 'Sugere ao atendente',
    description: 'A IA redige uma resposta e quem atende decide enviar. Nada vai ao cliente sem revisão.',
    tone: 'info',
  },
  reply: {
    label: 'Responde o cliente',
    description: 'A IA responde sozinha dentro das fontes e entrega para uma pessoa quando não sabe.',
    tone: 'warning',
  },
  act: {
    label: 'Responde e executa ações',
    description: 'Além de responder, pode chamar integrações e abrir ticket. Exige fontes confiáveis.',
    tone: 'danger',
  },
};

export const auditAction: Record<AuditAction, { label: string; tone: Tone }> = {
  created: { label: 'Criou', tone: 'success' },
  updated: { label: 'Alterou', tone: 'info' },
  deleted: { label: 'Removeu', tone: 'danger' },
  enabled: { label: 'Ativou', tone: 'success' },
  disabled: { label: 'Desativou', tone: 'warning' },
  tested: { label: 'Testou', tone: 'neutral' },
  reindexed: { label: 'Reindexou', tone: 'neutral' },
  published: { label: 'Publicou', tone: 'info' },
  restored: { label: 'Reverteu', tone: 'warning' },
  invited: { label: 'Convidou', tone: 'info' },
};

export const auditEntity: Record<AuditEntityType, string> = {
  channel: 'Canal',
  integration: 'Integração',
  knowledge_source: 'Fonte de conhecimento',
  ai_policy: 'Política da IA',
  queue: 'Fila',
  role: 'Papel',
  user: 'Usuário',
  contact: 'Contato',
  organization: 'Organização',
  workflow: 'Workflow',
};

export const userStatus: Record<UserStatus, { label: string; tone: Tone }> = {
  active: { label: 'Ativo', tone: 'success' },
  invited: { label: 'Convite pendente', tone: 'warning' },
  disabled: { label: 'Desativado', tone: 'neutral' },
};

// Catálogo exibido na matriz de papéis, agrupado por área.
export const permissionGroups: { title: string; permissions: { key: Permission; label: string; description: string }[] }[] = [
  {
    title: 'Atendimento',
    permissions: [
      { key: 'conversations.view_all', label: 'Ver todos os atendimentos', description: 'Sem isso, vê só os seus e os das filas de que participa.' },
      { key: 'conversations.take_over', label: 'Assumir atendimento de outra pessoa', description: 'Sem isso, só assume os que estão sem responsável.' },
      { key: 'conversations.reply', label: 'Responder clientes', description: 'Enviar mensagens e anotações internas.' },
      { key: 'conversations.transfer', label: 'Transferir atendimentos', description: 'Para outra pessoa ou fila.' },
    ],
  },
  {
    title: 'Tickets',
    permissions: [
      { key: 'tickets.view', label: 'Ver tickets', description: 'Acessar a lista e o detalhe dos tickets.' },
      { key: 'tickets.manage', label: 'Gerenciar tickets', description: 'Abrir, mudar status, prioridade e responsável.' },
    ],
  },
  {
    title: 'Contatos',
    permissions: [
      { key: 'contacts.view', label: 'Ver contatos', description: 'Acessar a base de contatos.' },
      { key: 'contacts.edit', label: 'Editar contatos', description: 'Alterar dados e etiquetas.' },
    ],
  },
  {
    title: 'Automação',
    permissions: [{ key: 'workflows.manage', label: 'Gerenciar workflows', description: 'Criar, editar, testar, publicar e reverter automações.' }],
  },
  {
    title: 'Configurações',
    permissions: [
      { key: 'settings.queues', label: 'Filas', description: 'Criar e editar filas e equipes.' },
      { key: 'settings.quick_replies', label: 'Respostas rápidas', description: 'Cadastrar mensagens prontas.' },
      { key: 'settings.users', label: 'Usuários e papéis', description: 'Convidar pessoas e definir permissões.' },
      { key: 'settings.channels', label: 'Canais', description: 'Conectar números de WhatsApp e ver a saúde da conexão.' },
      { key: 'settings.integrations', label: 'Integrações', description: 'Cadastrar APIs externas e ver os logs de execução.' },
      { key: 'settings.knowledge', label: 'Base de conhecimento', description: 'Cadastrar e reindexar as fontes que a IA cita.' },
      { key: 'settings.ai', label: 'Agente de IA', description: 'Definir autonomia, limites e regras de handoff.' },
      { key: 'settings.audit', label: 'Auditoria', description: 'Ver a trilha de quem mudou o quê.' },
    ],
  },
];

export const allPermissions: Permission[] = permissionGroups.flatMap((g) => g.permissions.map((p) => p.key));
