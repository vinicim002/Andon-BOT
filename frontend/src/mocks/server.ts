// "Servidor" em memória para a fase de descoberta. Aplica as mesmas regras que o back-end vai
// aplicar (protocolo gerado, eventos de auditoria, mensagens de sistema na conversa), para as
// telas serem desenhadas contra o comportamento real e não contra dados estáticos.
// Fica no sessionStorage da aba para sobreviver a recarregamentos durante demonstrações;
// fechar a aba volta aos dados iniciais. Não é persistência de verdade.
import type {
  Availability,
  Contact,
  Conversation,
  Id,
  Message,
  NewTicket,
  OperationalQueue,
  QueueInput,
  QuickReply,
  QuickReplyInput,
  Tag,
  TagColor,
  Ticket,
  TicketEvent,
  TransferTarget,
} from '../domain/types';
import * as seed from './data';

// Versão no nome: mudou o formato dos dados, a aba descarta o estado antigo.
const STORAGE_KEY = 'andon-mock-db-v2';

const initial = {
  users: [...seed.users],
  queues: [...seed.queues],
  endpoints: seed.endpoints,
  contacts: [...seed.contacts],
  tags: [...seed.tagCatalog],
  conversations: [...seed.conversations],
  messages: [...seed.messages],
  tickets: [...seed.tickets],
  ticketEvents: [...seed.ticketEvents],
  quickReplies: [...seed.quickReplies],
};

function load(): typeof initial {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? { ...initial, ...JSON.parse(saved) } : initial;
  } catch {
    return initial;
  }
}

export const db = load();

export function persist() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Sem armazenamento: o estado vale até recarregar.
  }
}

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const userName = (userId?: Id) => db.users.find((u) => u.id === userId)?.name ?? 'Alguém';

class NotFound extends Error {}

function conversationById(conversationId: Id) {
  const conversation = db.conversations.find((c) => c.id === conversationId);
  if (!conversation) throw new NotFound('Conversa não encontrada.');
  return conversation;
}

function patchConversation(conversationId: Id, patch: Partial<Conversation>) {
  conversationById(conversationId);
  db.conversations = db.conversations.map((c) => (c.id === conversationId ? { ...c, ...patch } : c));
}

function systemMessage(conversationId: Id, body: string) {
  db.messages = [
    ...db.messages,
    { id: id(), conversationId, direction: 'internal', senderType: 'system', contentType: 'text', body, createdAt: now() },
  ];
}

// ---------- Conversas ----------

export function markRead(conversationId: Id) {
  patchConversation(conversationId, { unreadCount: 0 });
}

export function assign(conversationId: Id, actorId: Id) {
  patchConversation(conversationId, { assigneeId: actorId, status: 'in_progress', botPaused: true });
  systemMessage(conversationId, `${userName(actorId)} assumiu o atendimento`);
}

export function transfer(conversationId: Id, target: TransferTarget, note: string | undefined, actorId: Id) {
  if (target.kind === 'user') {
    patchConversation(conversationId, { assigneeId: target.userId, status: 'in_progress', botPaused: true });
    systemMessage(conversationId, `${userName(actorId)} transferiu para ${userName(target.userId)}`);
  } else {
    const queue = db.queues.find((q) => q.id === target.queueId);
    patchConversation(conversationId, { queueId: target.queueId, assigneeId: undefined, status: 'queued' });
    systemMessage(conversationId, `${userName(actorId)} devolveu para a fila ${queue?.name ?? ''}`.trim());
  }
  // O resumo vira nota interna: quem recebe lê o contexto sem precisar rolar a conversa.
  if (note?.trim()) sendMessage(conversationId, `Resumo da transferência: ${note.trim()}`, true, actorId);
  if (target.kind === 'queue') distribute(target.queueId);
}

// ---------- Distribuição (rodízio por disponibilidade) ----------

const ACTIVE: Conversation['status'][] = ['in_progress', 'waiting_customer', 'waiting_internal'];
const activeLoad = (userId: Id) => db.conversations.filter((c) => c.assigneeId === userId && ACTIVE.includes(c.status)).length;

// Em filas com rodízio, cada conversa esperando vai para o membro disponível com menos
// atendimentos ativos (empate: ordem alfabética). Sem ninguém disponível, continua na fila.
export function distribute(queueId: Id) {
  const queue = db.queues.find((q) => q.id === queueId);
  if (!queue || queue.routingPolicy !== 'round_robin') return 0;
  const waiting = db.conversations
    .filter((c) => c.queueId === queueId && c.status === 'queued' && !c.assigneeId)
    .sort((a, b) => a.lastMessage.at.localeCompare(b.lastMessage.at));
  let assigned = 0;
  for (const conversation of waiting) {
    const candidates = db.users
      .filter((u) => queue.memberIds.includes(u.id) && u.availability === 'available')
      .sort((a, b) => activeLoad(a.id) - activeLoad(b.id) || a.name.localeCompare(b.name));
    if (candidates.length === 0) break;
    patchConversation(conversation.id, { assigneeId: candidates[0].id, status: 'in_progress', botPaused: true });
    systemMessage(conversation.id, `Distribuído automaticamente para ${candidates[0].name} (rodízio da fila ${queue.name})`);
    assigned++;
  }
  return assigned;
}

export function setAvailability(userId: Id, availability: Availability, pauseReason?: string) {
  db.users = db.users.map((u) =>
    u.id === userId ? { ...u, availability, pauseReason: availability === 'paused' ? pauseReason : undefined } : u,
  );
  // Ao ficar disponível, a pessoa puxa o que estava esperando nas filas dela.
  if (availability === 'available') {
    return db.queues.filter((q) => q.memberIds.includes(userId)).reduce((total, q) => total + distribute(q.id), 0);
  }
  return 0;
}

// ---------- Filas ----------

function validateQueue(input: QueueInput, ignoreId?: Id) {
  if (!input.name.trim()) throw new Error('Informe o nome da fila.');
  if (db.queues.some((q) => q.id !== ignoreId && q.name.toLowerCase() === input.name.trim().toLowerCase())) {
    throw new Error('Já existe uma fila com esse nome.');
  }
}

// Garante exatamente uma fila padrão.
function applyDefault(queueId: Id, isDefault: boolean) {
  if (isDefault) db.queues = db.queues.map((q) => ({ ...q, isDefault: q.id === queueId }));
}

export function createQueue(input: QueueInput): OperationalQueue {
  validateQueue(input);
  const queue: OperationalQueue = { ...input, name: input.name.trim(), id: id(), isDefault: false };
  db.queues = [...db.queues, queue];
  applyDefault(queue.id, input.isDefault);
  distribute(queue.id);
  return queue;
}

export function updateQueue(queueId: Id, input: QueueInput) {
  const current = db.queues.find((q) => q.id === queueId);
  if (!current) throw new NotFound('Fila não encontrada.');
  validateQueue(input, queueId);
  if (current.isDefault && !input.isDefault) throw new Error('Defina outra fila como padrão antes de desmarcar esta.');
  db.queues = db.queues.map((q) => (q.id === queueId ? { ...q, ...input, name: input.name.trim() } : q));
  applyDefault(queueId, input.isDefault);
  distribute(queueId);
}

// Conversas da fila excluída vão para a fila padrão; a padrão não pode ser excluída.
export function deleteQueue(queueId: Id) {
  const queue = db.queues.find((q) => q.id === queueId);
  if (!queue) throw new NotFound('Fila não encontrada.');
  if (queue.isDefault) throw new Error('A fila padrão não pode ser excluída. Defina outra como padrão antes.');
  const fallback = db.queues.find((q) => q.isDefault)!;
  const moved = db.conversations.filter((c) => c.queueId === queueId);
  db.conversations = db.conversations.map((c) => (c.queueId === queueId ? { ...c, queueId: fallback.id } : c));
  for (const c of moved) systemMessage(c.id, `Fila ${queue.name} excluída; conversa movida para ${fallback.name}`);
  db.queues = db.queues.filter((q) => q.id !== queueId);
  distribute(fallback.id);
  return moved.length;
}

// ---------- Respostas rápidas ----------

function normalizeShortcut(shortcut: string) {
  return shortcut.trim().replace(/^\//, '').toLowerCase();
}

function validateQuickReply(input: QuickReplyInput, ignoreId?: Id) {
  const shortcut = normalizeShortcut(input.shortcut);
  if (!/^[a-z0-9-]{2,24}$/.test(shortcut)) throw new Error('O atalho deve ter de 2 a 24 letras, números ou hífen, sem espaços.');
  if (!input.title.trim()) throw new Error('Informe o título.');
  if (!input.body.trim()) throw new Error('Escreva o texto da resposta.');
  if (db.quickReplies.some((r) => r.id !== ignoreId && r.shortcut === shortcut)) throw new Error(`O atalho /${shortcut} já existe.`);
  return { shortcut, title: input.title.trim(), body: input.body.trim() };
}

export function createQuickReply(input: QuickReplyInput): QuickReply {
  const reply = { ...validateQuickReply(input), id: id() };
  db.quickReplies = [...db.quickReplies, reply];
  return reply;
}

export function updateQuickReply(replyId: Id, input: QuickReplyInput) {
  const clean = validateQuickReply(input, replyId);
  db.quickReplies = db.quickReplies.map((r) => (r.id === replyId ? { ...r, ...clean } : r));
}

export function deleteQuickReply(replyId: Id) {
  db.quickReplies = db.quickReplies.filter((r) => r.id !== replyId);
}

export function setBotPaused(conversationId: Id, paused: boolean, actorId: Id) {
  patchConversation(conversationId, { botPaused: paused });
  systemMessage(conversationId, `${userName(actorId)} ${paused ? 'pausou' : 'retomou'} o bot`);
}

export function resolve(conversationId: Id, actorId: Id) {
  patchConversation(conversationId, { status: 'resolved' });
  systemMessage(conversationId, `${userName(actorId)} resolveu o atendimento`);
}

export function reopen(conversationId: Id, actorId: Id) {
  patchConversation(conversationId, { status: 'in_progress', assigneeId: actorId });
  systemMessage(conversationId, `${userName(actorId)} reabriu o atendimento`);
}

export function sendMessage(conversationId: Id, body: string, internal: boolean, actorId: Id): Message {
  const message: Message = {
    id: id(),
    conversationId,
    direction: internal ? 'internal' : 'outbound',
    senderType: 'user',
    senderUserId: actorId,
    contentType: 'text',
    body,
    deliveryStatus: internal ? undefined : 'sent',
    createdAt: now(),
  };
  db.messages = [...db.messages, message];
  if (!internal) {
    patchConversation(conversationId, {
      lastMessage: { preview: body, contentType: 'text', direction: 'outbound', deliveryStatus: 'sent', at: message.createdAt },
    });
  }
  return message;
}

export function setConversationTags(conversationId: Id, tags: Tag[]) {
  patchConversation(conversationId, { tags });
}

// ---------- Contatos e etiquetas ----------

export function updateContact(contactId: Id, patch: Partial<Contact>) {
  const current = db.contacts.find((c) => c.id === contactId);
  if (!current) throw new NotFound('Contato não encontrado.');
  const updated = { ...current, ...patch };
  db.contacts = db.contacts.map((c) => (c.id === contactId ? updated : c));
  // A conversa carrega uma cópia do contato (como a API vai devolver), então é atualizada junto.
  db.conversations = db.conversations.map((c) => (c.contact.id === contactId ? { ...c, contact: updated } : c));
  return updated;
}

export function createTag(name: string, color: TagColor): Tag {
  const existing = db.tags.find((t) => t.name.toLowerCase() === name.trim().toLowerCase());
  if (existing) return existing;
  const tag: Tag = { id: id(), name: name.trim(), color };
  db.tags = [...db.tags, tag];
  return tag;
}

// ---------- Tickets ----------

// Protocolo: AAAAMMDD + sequencial do dia com 5 dígitos. Gerado uma vez e nunca alterado.
function nextProtocol() {
  const d = new Date();
  const prefix = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const today = db.tickets.filter((t) => t.protocol.startsWith(prefix)).map((t) => Number(t.protocol.slice(8)));
  return prefix + String((today.length ? Math.max(...today) : 0) + 1).padStart(5, '0');
}

function ticketEvent(event: Omit<TicketEvent, 'id' | 'createdAt'>) {
  db.ticketEvents = [...db.ticketEvents, { ...event, id: id(), createdAt: now() }];
}

export function createTicket(input: NewTicket, actorId: Id): Ticket {
  if (input.conversationId && conversationById(input.conversationId).ticketId) {
    throw new Error('Esta conversa já tem um ticket aberto.');
  }
  const ticket: Ticket = { ...input, id: id(), protocol: nextProtocol(), status: 'open', createdAt: now(), updatedAt: now() };
  db.tickets = [...db.tickets, ticket];
  ticketEvent({ ticketId: ticket.id, type: 'created', actorUserId: actorId });
  if (input.conversationId) {
    patchConversation(input.conversationId, { ticketId: ticket.id });
    systemMessage(input.conversationId, `${userName(actorId)} abriu o ticket #${ticket.protocol}`);
  }
  return ticket;
}

type TicketPatch = Partial<Pick<Ticket, 'status' | 'priority' | 'assigneeId'>>;

export function updateTicket(ticketId: Id, patch: TicketPatch, actorId: Id) {
  const current = db.tickets.find((t) => t.id === ticketId);
  if (!current) throw new NotFound('Ticket não encontrado.');
  if (patch.status && patch.status !== current.status) {
    ticketEvent({ ticketId, type: 'status_changed', actorUserId: actorId, from: current.status, to: patch.status });
  }
  if (patch.priority && patch.priority !== current.priority) {
    ticketEvent({ ticketId, type: 'priority_changed', actorUserId: actorId, from: current.priority, to: patch.priority });
  }
  if ('assigneeId' in patch && patch.assigneeId !== current.assigneeId) {
    ticketEvent({ ticketId, type: 'assigned', actorUserId: actorId, from: current.assigneeId, to: patch.assigneeId });
  }
  const updated = { ...current, ...patch, updatedAt: now() };
  db.tickets = db.tickets.map((t) => (t.id === ticketId ? updated : t));
  return updated;
}

export function commentTicket(ticketId: Id, body: string, actorId: Id) {
  ticketEvent({ ticketId, type: 'comment', actorUserId: actorId, body });
  db.tickets = db.tickets.map((t) => (t.id === ticketId ? { ...t, updatedAt: now() } : t));
}
