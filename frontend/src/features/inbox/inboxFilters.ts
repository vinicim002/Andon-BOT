import type { Conversation, Id } from '../../domain/types';

// Abas de status da lista. Agrupam os estados canônicos da conversa na visão do atendente.
export type StatusTab = 'bot' | 'pending' | 'open' | 'resolved';

export function statusTabOf(c: Conversation): StatusTab {
  if (c.status === 'resolved' || c.status === 'closed') return 'resolved';
  if (c.status === 'new' && !c.botPaused) return 'bot';
  if (c.status === 'new' || c.status === 'queued') return 'pending';
  return 'open';
}

export type InboxFilter = 'all' | 'mine' | 'mentions' | 'unanswered' | 'unread';

export function matchesFilter(c: Conversation, filter: InboxFilter, meId: Id) {
  switch (filter) {
    case 'mine':
      return c.assigneeId === meId;
    // Menções ainda são simuladas: participação de outro atendente na conversa.
    case 'mentions':
      return c.participantIds.includes(meId);
    case 'unanswered':
      return c.lastMessage.direction === 'inbound';
    case 'unread':
      return c.unreadCount > 0;
    default:
      return true;
  }
}

// Busca por nome, empresa, telefone (só dígitos, ignora máscara) ou protocolo do ticket.
export function matchesSearch(c: Conversation, term: string, protocol?: string) {
  const text = term.trim().toLowerCase();
  if (!text) return true;
  const digits = text.replace(/\D/g, '');
  return (
    c.contact.name.toLowerCase().includes(text) ||
    Boolean(c.contact.organization?.toLowerCase().includes(text)) ||
    (digits.length >= 3 && (c.contact.phone.replace(/\D/g, '').includes(digits) || Boolean(protocol?.includes(digits))))
  );
}
