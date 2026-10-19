import {
  Flag,
  GitBranch,
  Globe,
  ListTree,
  MessageCircle,
  MessageSquarePlus,
  MessageSquareText,
  NotebookPen,
  Tag,
  Ticket,
  Type,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { ticketPriority } from '../../domain/labels';
import type { ConditionOperator, NodeConfig, NodeType, WorkflowNode } from '../../domain/workflow';

export type NodeGroup = 'trigger' | 'logic' | 'action';

type Lookup = { queueName: (id?: string) => string | undefined; tagName: (id?: string) => string | undefined };

type Entry<T extends NodeType> = {
  label: string;
  group: NodeGroup;
  icon: LucideIcon;
  description: string;
  summary: (config: NodeConfig[T], lookup: Lookup) => string;
};

export const operatorLabels: Record<ConditionOperator, string> = {
  contains: 'contém',
  not_contains: 'não contém',
  equals: 'é igual a',
  starts_with: 'começa com',
  ends_with: 'termina com',
  exists: 'está preenchido',
};

const clip = (text: string, max = 90) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export const catalog: { [T in NodeType]: Entry<T> } = {
  trigger_conversation_started: {
    label: 'Nova conversa',
    group: 'trigger',
    icon: MessageSquarePlus,
    description: 'Quando um cliente inicia uma conversa.',
    summary: () => 'Inicia quando um cliente abre uma conversa',
  },
  trigger_message_received: {
    label: 'Mensagem recebida',
    group: 'trigger',
    icon: MessageCircle,
    description: 'A cada mensagem do cliente.',
    summary: () => 'Inicia a cada mensagem do cliente',
  },
  trigger_keyword: {
    label: 'Palavra-chave',
    group: 'trigger',
    icon: Type,
    description: 'Quando a mensagem contém certas palavras.',
    summary: (c) => (c.keywords.filter(Boolean).length ? `Mensagem contém: ${c.keywords.filter(Boolean).join(', ')}` : 'Defina as palavras-chave'),
  },
  condition: {
    label: 'Condição',
    group: 'logic',
    icon: GitBranch,
    description: 'Segue por “Sim” ou “Não” conforme uma regra.',
    summary: (c) => `${c.field || '?'} ${operatorLabels[c.operator]}${c.operator === 'exists' ? '' : ` “${c.value || '?'}”`}`,
  },
  menu: {
    label: 'Menu de opções',
    group: 'logic',
    icon: ListTree,
    description: 'Pergunta e segue pela opção escolhida.',
    summary: (c) => clip(c.question || 'Escreva a pergunta'),
  },
  send_message: {
    label: 'Enviar mensagem',
    group: 'action',
    icon: MessageSquareText,
    description: 'Responde o cliente no WhatsApp.',
    summary: (c) => clip(c.text || 'Escreva a mensagem'),
  },
  transfer_queue: {
    label: 'Transferir para fila',
    group: 'action',
    icon: Users,
    description: 'Passa a conversa para atendimento humano.',
    summary: (c, l) => (c.queueId ? `Fila ${l.queueName(c.queueId) ?? '?'}` : 'Escolha a fila'),
  },
  add_tag: {
    label: 'Adicionar etiqueta',
    group: 'action',
    icon: Tag,
    description: 'Marca a conversa com uma etiqueta.',
    summary: (c, l) => (c.tagId ? `Etiqueta “${l.tagName(c.tagId) ?? '?'}”` : 'Escolha a etiqueta'),
  },
  open_ticket: {
    label: 'Abrir ticket',
    group: 'action',
    icon: Ticket,
    description: 'Cria um ticket com protocolo.',
    summary: (c) => (c.subject ? `${clip(c.subject, 60)} · ${ticketPriority[c.priority].label}` : 'Informe o assunto'),
  },
  internal_note: {
    label: 'Nota interna',
    group: 'action',
    icon: NotebookPen,
    description: 'Registra uma nota que só a equipe vê.',
    summary: (c) => clip(c.text || 'Escreva a nota'),
  },
  http_request: {
    label: 'Consultar sistema (HTTP)',
    group: 'action',
    icon: Globe,
    description: 'Chama uma API e guarda a resposta.',
    summary: (c) => `${c.method} ${clip(c.url.replace(/^https?:\/\//, ''), 50)} → {{${c.saveAs}}}`,
  },
  end: {
    label: 'Encerrar',
    group: 'action',
    icon: Flag,
    description: 'Termina o fluxo (e pode resolver o atendimento).',
    summary: (c) => (c.resolve ? 'Encerra e resolve o atendimento' : 'Encerra o fluxo'),
  },
};

export const groupLabels: Record<NodeGroup, string> = { trigger: 'Gatilho', logic: 'Lógica', action: 'Ações' };

export const nodeTypesByGroup = (group: NodeGroup) => (Object.keys(catalog) as NodeType[]).filter((t) => catalog[t].group === group);

export function nodeSummary(node: WorkflowNode, lookup: Lookup) {
  return (catalog[node.type].summary as (c: unknown, l: Lookup) => string)(node.config, lookup);
}

export function triggerLabel(nodes: WorkflowNode[]) {
  const trigger = nodes.find((n) => catalog[n.type].group === 'trigger');
  return trigger ? catalog[trigger.type].label : 'Sem gatilho';
}
