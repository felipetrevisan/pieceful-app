# Pieceful

Aplicativo web em português para transformar fotos em quebra-cabeças de 12 a 1.000 peças.

## Estrutura

- `apps/web`: Next.js App Router, Canvas, GSAP, Web Worker e IndexedDB.
- `apps/api`: API Elysia independente para futuras sincronizações.
- `packages/puzzle-engine`: topologia determinística, geometria e caminhos das peças.
- `packages/shared`: contratos e validações compartilhadas.

## Desenvolvimento

```bash
bun install
bun run dev
```

O Turborepo inicia os workspaces web e API em paralelo. Para executar apenas um deles:

```bash
bun run dev:web
bun run dev:api
```

Validação completa:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

Os pipelines usam cache local em `.turbo` e respeitam o grafo de dependências dos workspaces.

## Convenção de rotas

Todas as rotas do frontend e da API são escritas em inglês. A interface pode permanecer localizada
em português, mas novos caminhos públicos e endpoints devem seguir essa convenção.

As fotos são processadas e armazenadas localmente no navegador. Nenhuma imagem é enviada pela API.

## Unsplash

Copie `apps/api/.env.example` para `apps/api/.env` e informe a Access Key criada no painel de
desenvolvedores do Unsplash. O frontend usa `NEXT_PUBLIC_API_URL`, documentado em
`apps/web/.env.example`, para buscar as fotos sem expor essa chave no navegador.

A seleção mantém os créditos do fotógrafo e registra o download conforme as diretrizes da API do
Unsplash. As imagens continuam sendo processadas e salvas somente no dispositivo do jogador.
