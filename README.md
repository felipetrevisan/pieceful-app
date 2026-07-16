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

Validação completa:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

As fotos são processadas e armazenadas localmente no navegador. Nenhuma imagem é enviada pela API.
