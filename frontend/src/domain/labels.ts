import type { Availability, ConversationStatus, Permission, TicketPriority, TicketStatus, UserStatus } from './types';

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
    ],
  },
];

export const allPermissions: Permission[] = permissionGroups.flatMap((g) => g.permissions.map((p) => p.key));
