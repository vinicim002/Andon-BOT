# Uso do projeto antigo como referência

A pasta `handle-bot-antigo/` (na raiz, **fora do Git**) contém a implementação atual do bot em
Node.js. Ela é **exclusivamente referência funcional e técnica** — não é a base da nova aplicação.

## O que fazer

- Aproveitar **regras de negócio, comportamentos, fluxos e funcionalidades já validadas**.
- Reavaliar o código Node.js e, quando a funcionalidade for necessária, **reimplementá-la em Java**
  (ou no novo front-end) seguindo a nova arquitetura.
- Aproveitar aprendizados de UX e testes como insumo de critérios de aceite.

## O que não fazer

- Não migrar código mecanicamente nem copiar arquivos inteiros.
- Não copiar decisões arquiteturais antigas automaticamente.
- Não migrar funcionalidades que não fazem sentido no novo produto.
- Não depender de nada dentro de `handle-bot-antigo/` em build, testes ou runtime.

## Desenvolvimento paralelo

O bot antigo continua em uso e recebendo atualizações. Os dois projetos coexistem até a nova
plataforma atingir paridade funcional suficiente; então ela passa a ser a solução principal.
É uma **migração progressiva de capacidades**, não de código.

Consulte o `handle-bot-antigo/` periodicamente (ex.: `git log` dele) e, para cada novidade, avalie:

1. a funcionalidade é necessária no novo produto?
2. como ela se encaixa na nova arquitetura?
3. deve ser reimplementada?
4. existe uma forma melhor de implementá-la na nova estrutura?

Registre a conclusão em [paridade-com-bot-antigo.md](paridade-com-bot-antigo.md).

## Princípio

> Copiar comportamentos e regras de negócio quando fizer sentido, mas não copiar limitações
> arquiteturais do sistema antigo.
