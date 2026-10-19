// Modelos prontos e configuração padrão de cada tipo de nó. Começar de um modelo é o caminho
// mais rápido para a primeira automação; o "em branco" só traz o gatilho.
import type { NodeConfig, NodeType, WorkflowDefinition, WorkflowEdge, WorkflowNode, WorkflowTemplate } from './workflow';
import { WORKFLOW_SCHEMA_VERSION } from './workflow';

export function defaultConfig<T extends NodeType>(type: T): NodeConfig[T] {
  const defaults: { [K in NodeType]: NodeConfig[K] } = {
    trigger_conversation_started: {},
    trigger_message_received: {},
    trigger_keyword: { keywords: [] },
    condition: { field: 'mensagem', operator: 'contains', value: '' },
    menu: { question: '', options: ['', ''] },
    send_message: { text: '' },
    transfer_queue: { summary: '' },
    add_tag: {},
    open_ticket: { subject: '', priority: 'normal' },
    internal_note: { text: '' },
    http_request: { method: 'GET', url: 'https://', saveAs: 'resultado' },
    end: { resolve: false },
  };
  return structuredClone(defaults[type]);
}

const node = <T extends NodeType>(id: string, type: T, x: number, y: number, config: NodeConfig[T]): WorkflowNode =>
  ({ id, type, position: { x, y }, config }) as WorkflowNode;
const edge = (source: string, sourceHandle: string, target: string): WorkflowEdge => ({ id: `${source}:${sourceHandle}`, source, sourceHandle, target });

const definitions: Record<WorkflowTemplate, () => WorkflowDefinition> = {
  blank: () => ({
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    nodes: [node('start', 'trigger_message_received', 240, 40, {})],
    edges: [],
  }),

  triage: () => ({
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    nodes: [
      node('start', 'trigger_conversation_started', 300, 0, {}),
      node('hello', 'send_message', 300, 130, { text: 'Olá, {{contato.nome}}! 👋 Sou o assistente virtual da Empresa Exemplo.' }),
      node('menu', 'menu', 300, 270, { question: 'Como posso te ajudar hoje?', options: ['Fazer uma cotação', 'Acompanhar um pedido', 'Falar com o financeiro'] }),
      node('sales', 'transfer_queue', -40, 500, { queueId: 'q1', summary: 'Cliente quer uma cotação.' }),
      node('support', 'transfer_queue', 240, 500, { queueId: 'q2', summary: 'Cliente quer acompanhar um pedido.' }),
      node('finance', 'transfer_queue', 520, 500, { queueId: 'q3', summary: 'Assunto financeiro.' }),
      node('retry', 'send_message', 800, 500, { text: 'Não entendi 😅 Responda com o número de uma das opções.' }),
    ],
    edges: [
      edge('start', 'next', 'hello'),
      edge('hello', 'next', 'menu'),
      edge('menu', 'option-0', 'sales'),
      edge('menu', 'option-1', 'support'),
      edge('menu', 'option-2', 'finance'),
      edge('menu', 'invalid', 'retry'),
      edge('retry', 'next', 'menu'),
    ],
  }),

  order_status: () => ({
    schemaVersion: WORKFLOW_SCHEMA_VERSION,
    nodes: [
      node('start', 'trigger_keyword', 300, 0, { keywords: ['pedido', 'rastreio', 'entrega'] }),
      node('wait', 'send_message', 300, 130, { text: 'Vou consultar seu pedido, {{contato.nome}}. Só um instante…' }),
      node('erp', 'http_request', 300, 260, { method: 'GET', url: 'https://erp.exemplo.com.br/pedidos?cliente={{contato.nome}}', saveAs: 'pedido' }),
      node('delivered', 'condition', 300, 400, { field: 'pedido.status', operator: 'equals', value: 'Entregue' }),
      node('done', 'send_message', 60, 560, { text: 'Seu pedido {{pedido.numero}} já foi entregue ✅ Posso ajudar em algo mais?' }),
      node('eta', 'send_message', 540, 560, { text: 'Seu pedido {{pedido.numero}} está {{pedido.status}}, com previsão de entrega {{pedido.previsao}}. 🚚' }),
      node('end1', 'end', 60, 700, { resolve: true }),
      node('end2', 'end', 540, 700, { resolve: true }),
    ],
    edges: [
      edge('start', 'next', 'wait'),
      edge('wait', 'next', 'erp'),
      edge('erp', 'next', 'delivered'),
      edge('delivered', 'yes', 'done'),
      edge('delivered', 'no', 'eta'),
      edge('done', 'next', 'end1'),
      edge('eta', 'next', 'end2'),
    ],
  }),
};

export const templateInfo: Record<WorkflowTemplate, { name: string; description: string }> = {
  blank: { name: 'Em branco', description: 'Só o gatilho. Monte do seu jeito.' },
  triage: { name: 'Triagem de boas-vindas', description: 'Cumprimenta, pergunta o assunto e manda para a fila certa.' },
  order_status: { name: 'Status do pedido', description: 'Consulta o pedido no sistema da empresa e responde sozinho.' },
};

// Cópia com ids novos, para dois workflows nunca compartilharem ids de nó.
export function templateDefinition(template: WorkflowTemplate): WorkflowDefinition {
  const def = definitions[template]();
  const ids = new Map(def.nodes.map((n) => [n.id, crypto.randomUUID().slice(0, 8)]));
  return {
    schemaVersion: def.schemaVersion,
    nodes: def.nodes.map((n) => ({ ...n, id: ids.get(n.id)! })),
    edges: def.edges.map((e) => ({ ...e, id: `${ids.get(e.source)}:${e.sourceHandle}`, source: ids.get(e.source)!, target: ids.get(e.target)! })),
  };
}
