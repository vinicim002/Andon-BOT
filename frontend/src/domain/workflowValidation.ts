// Validação da definição. Roda no console (feedback no canvas) e no "servidor" antes de publicar;
// o back-end repetirá as mesmas regras — o console nunca é a única barreira.
import type { NodeType, WorkflowDefinition, WorkflowNode } from './workflow';

export type ValidationIssue = { nodeId?: string; message: string };

export const isTrigger = (type: NodeType) => type.startsWith('trigger_');

// Saídas de cada nó: o editor desenha uma alça por saída e a validação confere as ligações.
export function outputsOf(node: WorkflowNode): { id: string; label?: string }[] {
  switch (node.type) {
    case 'condition':
      return [
        { id: 'yes', label: 'Sim' },
        { id: 'no', label: 'Não' },
      ];
    case 'menu': {
      const options = (node.config as { options: string[] }).options;
      return [...options.map((o, i) => ({ id: `option-${i}`, label: `${i + 1}. ${o || 'Opção'}` })), { id: 'invalid', label: 'Resposta inválida' }];
    }
    case 'transfer_queue':
    case 'end':
      return [];
    default:
      return [{ id: 'next' }];
  }
}

const blank = (value: unknown) => typeof value !== 'string' || !value.trim();

function configIssues(node: WorkflowNode): string[] {
  const c = node.config as Record<string, unknown>;
  switch (node.type) {
    case 'trigger_keyword':
      return (c.keywords as string[]).filter((k) => k.trim()).length === 0 ? ['Informe pelo menos uma palavra-chave.'] : [];
    case 'condition':
      return [
        ...(blank(c.field) ? ['Escolha o campo da condição.'] : []),
        ...(c.operator !== 'exists' && blank(c.value) ? ['Informe o valor da condição.'] : []),
      ];
    case 'menu': {
      const options = (c.options as string[]).filter((o) => o.trim());
      return [...(blank(c.question) ? ['Escreva a pergunta do menu.'] : []), ...(options.length < 2 ? ['O menu precisa de pelo menos 2 opções.'] : [])];
    }
    case 'send_message':
      return blank(c.text) ? ['Escreva a mensagem.'] : [];
    case 'internal_note':
      return blank(c.text) ? ['Escreva a nota.'] : [];
    case 'transfer_queue':
      return c.queueId ? [] : ['Escolha a fila.'];
    case 'add_tag':
      return c.tagId ? [] : ['Escolha a etiqueta.'];
    case 'open_ticket':
      return blank(c.subject) ? ['Informe o assunto do ticket.'] : [];
    case 'http_request':
      return [
        ...(/^https?:\/\/\S+$/.test(String(c.url ?? '')) ? [] : ['Informe uma URL começando com http:// ou https://.']),
        ...(/^[a-z][a-z0-9_]*$/.test(String(c.saveAs ?? '')) ? [] : ['“Guardar como” deve usar letras minúsculas, números ou _.']),
      ];
    default:
      return [];
  }
}

export function validateWorkflow(def: WorkflowDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const triggers = def.nodes.filter((n) => isTrigger(n.type));
  if (triggers.length === 0) issues.push({ message: 'Adicione um gatilho: é ele que inicia o workflow.' });
  if (triggers.length > 1) triggers.slice(1).forEach((t) => issues.push({ nodeId: t.id, message: 'Só pode existir um gatilho.' }));

  const reachable = new Set<string>();
  const walk = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    def.edges.filter((e) => e.source === id).forEach((e) => walk(e.target));
  };
  if (triggers[0]) walk(triggers[0].id);

  for (const node of def.nodes) {
    configIssues(node).forEach((message) => issues.push({ nodeId: node.id, message }));
    if (!isTrigger(node.type) && triggers[0] && !reachable.has(node.id)) {
      issues.push({ nodeId: node.id, message: 'Passo solto: nenhum caminho a partir do gatilho chega aqui.' });
    }
    // Condição e menu precisam de todos os caminhos ligados: o cliente nunca pode ficar sem resposta.
    if (node.type === 'condition' || node.type === 'menu') {
      for (const out of outputsOf(node)) {
        if (!def.edges.some((e) => e.source === node.id && e.sourceHandle === out.id)) {
          issues.push({ nodeId: node.id, message: `Ligue a saída “${out.label}”.` });
        }
      }
    }
  }
  if (triggers[0] && !def.edges.some((e) => e.source === triggers[0].id)) {
    issues.push({ nodeId: triggers[0].id, message: 'Ligue o gatilho ao primeiro passo.' });
  }
  return issues;
}
