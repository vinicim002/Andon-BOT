// Executor de teste da definição, rodando no console. Reproduz a semântica que os workers Java vão
// seguir: segue as ligações a partir do gatilho, para no menu aguardando o cliente, registra cada passo
// (status e duração) e interrompe em loop. A integração HTTP é simulada — nada sai do navegador.
import type { ConditionOperator, NodeConfig, WorkflowDefinition, WorkflowNode } from './workflow';
import { isTrigger, outputsOf } from './workflowValidation';

export type Vars = Record<string, unknown>;

export type RunEvent =
  | { kind: 'bot'; text: string; options?: string[] }
  | { kind: 'system'; text: string }
  | { kind: 'step'; nodeId: string; label: string; status: 'ok' | 'error' | 'skipped'; detail: string; durationMs: number };

export type RunState = { vars: Vars; waitingNodeId?: string; finished: boolean; steps: number };

export type RunContext = {
  contactName: string;
  queueName: (id?: string) => string | undefined;
  tagName: (id?: string) => string | undefined;
  nodeLabel: (node: WorkflowNode) => string;
};

const MAX_STEPS = 40;

// {{contato.nome}}, {{mensagem}}, {{pedido.status}}…
export function interpolate(text: string, vars: Vars) {
  return text.replace(/\{\{\s*([a-z_][a-z0-9_.]*)\s*\}\}/gi, (_, path: string) => {
    const value = path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Vars)[key] : undefined), vars);
    return value === undefined || value === null ? '' : String(value);
  });
}

function read(vars: Vars, path: string) {
  return interpolate(`{{${path}}}`, vars);
}

function check(operator: ConditionOperator, actual: string, expected: string) {
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();
  switch (operator) {
    case 'contains':
      return a.includes(e);
    case 'not_contains':
      return !a.includes(e);
    case 'equals':
      return a.trim() === e.trim();
    case 'starts_with':
      return a.startsWith(e);
    case 'ends_with':
      return a.endsWith(e);
    case 'exists':
      return a.trim().length > 0;
  }
}

// Resposta simulada por padrão de URL, para testar caminhos de sucesso e de erro sem sistema externo.
async function simulateHttp(url: string): Promise<{ ok: boolean; status: number; body: Vars }> {
  await new Promise((r) => setTimeout(r, 350));
  if (/erro|error|fail/i.test(url)) return { ok: false, status: 500, body: { erro: 'Serviço indisponível (simulado)' } };
  if (/pedido|order|rastreio|track/i.test(url)) {
    return { ok: true, status: 200, body: { numero: '4521', status: 'Em trânsito', previsao: 'amanhã até 18h', transportadora: 'Transportes Exemplo' } };
  }
  return { ok: true, status: 200, body: { ok: true } };
}

const next = (def: WorkflowDefinition, nodeId: string, handle: string) => def.edges.find((e) => e.source === nodeId && e.sourceHandle === handle)?.target;

export function triggerMatches(def: WorkflowDefinition, message: string): { node?: WorkflowNode; matched: boolean; reason?: string } {
  const node = def.nodes.find((n) => isTrigger(n.type));
  if (!node) return { matched: false, reason: 'O workflow não tem gatilho.' };
  if (node.type === 'trigger_keyword') {
    const keywords = (node.config as NodeConfig['trigger_keyword']).keywords.filter((k) => k.trim());
    const hit = keywords.find((k) => message.toLowerCase().includes(k.toLowerCase()));
    return hit ? { node, matched: true } : { node, matched: false, reason: `A mensagem não contém nenhuma palavra-chave (${keywords.join(', ')}).` };
  }
  return { node, matched: true };
}

// Executa a partir de um nó até terminar ou parar num menu.
async function runFrom(def: WorkflowDefinition, startId: string | undefined, state: RunState, ctx: RunContext, emit: (e: RunEvent) => void) {
  let currentId = startId;
  while (currentId) {
    if (++state.steps > MAX_STEPS) {
      emit({ kind: 'system', text: `Execução interrompida: mais de ${MAX_STEPS} passos (provável loop).` });
      state.finished = true;
      return;
    }
    const node = def.nodes.find((n) => n.id === currentId);
    if (!node) break;
    const started = performance.now();
    const step = (status: 'ok' | 'error' | 'skipped', detail: string) =>
      emit({ kind: 'step', nodeId: node.id, label: ctx.nodeLabel(node), status, detail, durationMs: Math.round(performance.now() - started) });
    const c = node.config as Record<string, unknown>;

    switch (node.type) {
      case 'send_message': {
        const text = interpolate(String(c.text), state.vars);
        emit({ kind: 'bot', text });
        step('ok', 'Mensagem enviada');
        currentId = next(def, node.id, 'next');
        break;
      }
      case 'menu': {
        const options = (c.options as string[]).filter((o) => o.trim());
        emit({ kind: 'bot', text: interpolate(String(c.question), state.vars), options });
        step('ok', 'Aguardando resposta do cliente');
        state.waitingNodeId = node.id;
        return;
      }
      case 'condition': {
        const actual = read(state.vars, String(c.field));
        const result = check(c.operator as ConditionOperator, actual, interpolate(String(c.value ?? ''), state.vars));
        step('ok', `“${actual || '(vazio)'}” → ${result ? 'Sim' : 'Não'}`);
        currentId = next(def, node.id, result ? 'yes' : 'no');
        break;
      }
      case 'transfer_queue': {
        const queue = ctx.queueName(c.queueId as string) ?? 'fila';
        emit({ kind: 'system', text: `Conversa transferida para a fila ${queue}. O atendimento humano assume daqui.` });
        if (String(c.summary ?? '').trim()) emit({ kind: 'system', text: `Nota para a equipe: ${interpolate(String(c.summary), state.vars)}` });
        step('ok', `Transferida para ${queue}`);
        state.finished = true;
        return;
      }
      case 'add_tag':
        step('ok', `Etiqueta “${ctx.tagName(c.tagId as string) ?? '?'}” aplicada`);
        currentId = next(def, node.id, 'next');
        break;
      case 'open_ticket': {
        const subject = interpolate(String(c.subject), state.vars);
        state.vars.ticket = { protocolo: '20261018' + String(Math.floor(Math.random() * 90000) + 10000), assunto: subject };
        step('ok', `Ticket aberto: ${subject} (#${(state.vars.ticket as Vars).protocolo})`);
        currentId = next(def, node.id, 'next');
        break;
      }
      case 'internal_note':
        step('ok', `Nota: ${interpolate(String(c.text), state.vars)}`);
        currentId = next(def, node.id, 'next');
        break;
      case 'http_request': {
        const url = interpolate(String(c.url), state.vars);
        const response = await simulateHttp(url);
        state.vars[String(c.saveAs)] = response.body;
        if (!response.ok) {
          step('error', `${c.method} ${url} → ${response.status}. Fluxo encerrado; a conversa segue para atendimento humano.`);
          emit({ kind: 'system', text: 'Falha na integração: a conversa foi encaminhada para atendimento humano.' });
          state.finished = true;
          return;
        }
        step('ok', `${c.method} ${url} → ${response.status}; guardado em {{${c.saveAs}.…}}`);
        currentId = next(def, node.id, 'next');
        break;
      }
      case 'end':
        step('ok', c.resolve ? 'Atendimento encerrado como resolvido' : 'Fluxo encerrado');
        emit({ kind: 'system', text: c.resolve ? 'Atendimento resolvido pelo workflow.' : 'Fim do workflow.' });
        state.finished = true;
        return;
      default:
        // Gatilho: só segue para o primeiro passo.
        step('ok', 'Gatilho disparado');
        currentId = next(def, node.id, 'next');
    }
  }
  if (!state.finished) {
    emit({ kind: 'system', text: 'Fim do caminho: nenhum passo seguinte.' });
    state.finished = true;
  }
}

export async function startRun(def: WorkflowDefinition, message: string, ctx: RunContext, emit: (e: RunEvent) => void): Promise<RunState> {
  const state: RunState = { vars: { mensagem: message, contato: { nome: ctx.contactName.split(' ')[0], nome_completo: ctx.contactName } }, finished: false, steps: 0 };
  const trigger = triggerMatches(def, message);
  if (!trigger.matched || !trigger.node) {
    emit({ kind: 'system', text: `O gatilho não disparou. ${trigger.reason ?? ''}` });
    state.finished = true;
    return state;
  }
  await runFrom(def, trigger.node.id, state, ctx, emit);
  return state;
}

// Resposta do cliente a um menu: aceita o número ("2") ou o texto da opção.
export async function answerMenu(def: WorkflowDefinition, state: RunState, message: string, ctx: RunContext, emit: (e: RunEvent) => void) {
  const node = def.nodes.find((n) => n.id === state.waitingNodeId);
  state.waitingNodeId = undefined;
  state.vars.mensagem = message;
  if (!node) return state;
  const options = (node.config as NodeConfig['menu']).options.filter((o) => o.trim());
  const typed = message.trim().toLowerCase();
  const index = /^\d+$/.test(typed) ? Number(typed) - 1 : options.findIndex((o) => o.toLowerCase() === typed);
  const valid = index >= 0 && index < options.length;
  const handle = valid ? `option-${index}` : 'invalid';
  const outputs = outputsOf(node);
  emit({
    kind: 'step',
    nodeId: node.id,
    label: ctx.nodeLabel(node),
    status: 'ok',
    detail: valid ? `Cliente escolheu “${options[index]}”` : `Resposta “${message}” não corresponde a nenhuma opção → ${outputs.at(-1)?.label}`,
    durationMs: 0,
  });
  if (valid) state.vars.opcao = options[index];
  await runFrom(def, next(def, node.id, handle), state, ctx, emit);
  return state;
}
