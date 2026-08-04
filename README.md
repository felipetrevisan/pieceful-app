# Pieceful

Aplicativo web e mobile para transformar fotos em quebra-cabeças de 12 a 1.000 peças.

## Estrutura

- `apps/web`: Next.js App Router, Canvas, GSAP, Web Worker e IndexedDB.
- `apps/api`: API Elysia para Unsplash, administração e downloads autorizados de pacotes.
- `apps/mobile`: aplicativo Expo/React Native para Android e iOS, com funcionamento offline.
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
bun run doctor
bun run build
```

Os pipelines usam cache local em `.turbo` e respeitam o grafo de dependências dos workspaces.

## Convenção de rotas

Todas as rotas do frontend e da API são escritas em inglês. A interface pode permanecer localizada
em português, mas novos caminhos públicos e endpoints devem seguir essa convenção.

Na web, as fotos são processadas e armazenadas somente no navegador. No mobile, jogadores
autenticados podem sincronizar partidas e fotos pessoais com buckets privados do Supabase.

O build principal gera o frontend Next.js, a API Bun e o bundle Android do aplicativo mobile.
Use `bun run build:ios` dentro de `apps/mobile` para validar o bundle iOS. O Expo web é apenas uma
prévia opcional; a superfície web de produção é `apps/web`.

## Supabase e segurança

As migrações em `supabase/migrations` devem ser aplicadas em ordem. Elas protegem fotos pessoais,
derivam XP e conquistas no banco, restringem mutações a RPCs, tornam pacotes privados e criam
sessões administrativas revogáveis. Consulte `SECURITY.md` para o modelo de confiança e
`docs/operations-security.md` para implantação, restauração e resposta a incidentes.

Pacotes pagos exigem as variáveis RevenueCat da API e `EXPO_PUBLIC_API_URL` no mobile. A API valida
a compra ou nível, impõe a versão mínima e emite URLs de 15 minutos; o app valida SHA-256 antes de
instalar cada imagem.

## Unsplash

Copie `apps/api/.env.example` para `apps/api/.env` e informe a Access Key criada no painel de
desenvolvedores do Unsplash. O frontend usa `NEXT_PUBLIC_API_URL`, documentado em
`apps/web/.env.example`, para buscar as fotos sem expor essa chave no navegador.

Depois de criar o arquivo, inicie web e API juntos com `bun run dev`. Para abrir pelo celular na
mesma rede, use `http://IP_DO_COMPUTADOR:3000`; o frontend direciona automaticamente as chamadas
para a porta `3001` do mesmo computador. Se o firewall do sistema solicitar permissão para conexões
de entrada do Bun, permita o acesso à rede local.

A seleção mantém os créditos do fotógrafo e registra o download conforme as diretrizes da API do
Unsplash. As imagens continuam sendo processadas e salvas somente no dispositivo do jogador.
