# Versionamento e segurança

> O repositório é **público**. Trate tudo que for commitado como visível para qualquer pessoa.

## Regra geral

**Nenhuma informação sensível, credencial ou material exclusivamente interno deve ser versionado.**

## Nunca versionar

- arquivos `.env` e variações (`.env.local`, `.env.prod`, `.env.bak` etc.) — apenas
  `.env.example`, com valores fictícios, pode ir para o Git;
- tokens, senhas, chaves de API, segredos de webhook, chaves privadas e certificados
  (`*.pem`, `*.key`, `*.p12` etc.);
- contas de serviço de nuvem (`service-account*.json`, `*-sa.json`);
- sessões e credenciais de WhatsApp;
- dumps, backups e bancos locais com dados reais;
- documentação interna (nomes de clientes, contratos, preços, pilotos, custos), salvo decisão
  explícita em contrário registrada nesta pasta;
- o documento `DECISOES-DE-ARQUITETURA.md` (cópia local de cada pessoa);
- a pasta `handle-bot-antigo/` (repositório próprio, usado só como referência local);
- configurações locais de cada máquina dentro de `.claude/` (`settings.local.json`);
- pastas de outras ferramentas de IA (`.codex/`, `.cursor/` etc.) — que, de qualquer forma,
  não devem ser criadas.

O `.gitignore` da raiz já bloqueia esses padrões. **Não remova entradas dele** sem decisão do time.

## Segredos no código

- Configuração sensível sempre por variável de ambiente; nunca valor padrão real no código.
- Credenciais de integrações são cifradas no banco e nunca aparecem em logs, respostas de API ou
  mensagens de erro.
- Dados de exemplo (mocks, seeds, testes) usam nomes, telefones e empresas fictícios.

## Se algo sensível for commitado

1. Considere o segredo **vazado**: revogue e gere outro imediatamente.
2. Remova do histórico (não basta um novo commit apagando o arquivo).
3. Avise o time.

## Isolamento de dados (multi-tenant)

Todo dado, evento, arquivo, busca, cache e métrica tem limite explícito de tenant. Defesa em
profundidade: contexto de tenant na aplicação, filtros e validações, e RLS no PostgreSQL.
