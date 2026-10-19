import type { Availability, ConversationStatus, TicketPriority, TicketStatus } from './types';

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
