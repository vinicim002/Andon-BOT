# Regras de commit

## Formato

```
<prefixo>: <descrição em português>
```

- O **prefixo** é em inglês, minúsculo, seguido de dois pontos e um espaço.
- A **descrição** é em português, no presente do indicativo, começando com letra minúscula e sem
  ponto final.
- Escopo opcional entre parênteses: `feat(inbox): adiciona filtro por fila`.

## Prefixos permitidos

| Prefixo | Uso |
| --- | --- |
| `feat` | Nova funcionalidade |
| `fix` | Correção de defeito |
| `refactor` | Mudança de código sem alterar comportamento |
| `docs` | Documentação |
| `style` | Formatação, sem mudança de lógica |
| `test` | Testes |
| `chore` | Manutenção, dependências, configuração |
| `build` | Build, empacotamento, Docker |
| `ci` | Pipelines de integração/entrega |
| `perf` | Melhoria de desempenho |

## Exemplos

```
feat: adiciona distribuição automática de atendimentos
fix: corrige falha na criação de tickets
refactor: reorganiza serviço de mensagens
docs: atualiza documentação da arquitetura
```

## Autoria

- O commit tem **apenas o autor real** responsável pelo desenvolvimento (ex.: Vinícius, Felipe,
  Lucas), com o `user.name` e `user.email` dessa pessoa no Git.
- **Proibido** adicionar `Co-authored-by`, `Generated with`, `Signed-off-by` de ferramenta ou
  qualquer referência a Claude, Codex, ChatGPT, Cursor, Antigravity ou similares, seja na mensagem
  do commit, na descrição de pull request ou em comentários de código.
- Ferramentas de IA que gerarem commits devem seguir esta regra mesmo que o padrão delas seja
  outro.

## Boas práticas

- Um commit, um assunto. Separe refatoração de mudança de comportamento.
- Antes de commitar, revise o `git diff --staged` para garantir que nada sensível entrou (ver
  [versionamento-e-seguranca.md](versionamento-e-seguranca.md)).
