# .cloud — contexto central do projeto

Esta pasta é a **única fonte central** de regras, convenções e contexto do Andon.
Vale para qualquer pessoa ou ferramenta (inclusive assistentes de IA) que trabalhe no repositório.

Antes de qualquer alteração, leia os arquivos abaixo:

| Arquivo | Conteúdo |
| --- | --- |
| [regras-de-commit.md](regras-de-commit.md) | Padrão de mensagens e autoria dos commits |
| [versionamento-e-seguranca.md](versionamento-e-seguranca.md) | O que pode e o que não pode ir para o Git |
| [arquitetura.md](arquitetura.md) | Resumo das decisões técnicas que guiam o código |
| [estrutura-e-convencoes.md](estrutura-e-convencoes.md) | Organização do monorepo e padrões de código |
| [estrategia-de-desenvolvimento.md](estrategia-de-desenvolvimento.md) | Front-end guiando o produto e o back-end |
| [projeto-antigo.md](projeto-antigo.md) | Como usar o bot antigo como referência |

## Regras inegociáveis

1. **Uma única pasta de contexto: `.cloud/`.** Não criar `.claude/`, `.codex/`, `.chatgpt/`,
   `.cursor/`, `.antigravity/`, `.agents/`, `AGENTS.md` ou qualquer pasta/arquivo específico de
   assistente, agente ou ferramenta de IA. Tudo que orienta o desenvolvimento fica aqui.
2. **Commits sem coautoria de IA** e no padrão `prefixo: descrição em português`.
3. **Nada sensível ou exclusivamente interno no repositório** (o repositório é público).
4. **O projeto antigo é referência, não base.** Copiar comportamento e regra de negócio quando
   fizer sentido; nunca copiar limitações arquiteturais.

## Documento de referência

O documento completo **Decisões de Arquitetura** (`DECISOES-DE-ARQUITETURA.md`, na raiz) é a
referência principal do produto. Ele contém informação interna (clientes, pilotos, custos) e por
isso **não é versionado**: cada pessoa do time mantém a cópia local. O resumo técnico que pode ser
público está em [arquitetura.md](arquitetura.md).

Quando uma decisão mudar, atualize o documento interno e o arquivo correspondente desta pasta.
