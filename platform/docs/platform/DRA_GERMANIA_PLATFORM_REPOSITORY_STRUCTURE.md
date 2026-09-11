# DRA_GERMANIA_PLATFORM_REPOSITORY_STRUCTURE

Estrutura do repositório e estratégia de migração para `platform/`.

Status: organização e normalização (pós-Lote 1).

Data de referência: 2026-09-11.

## Raiz Git principal

```text
D:\YZIHUB Germania Bandeira
```

Repositório aninhado **proibido** e fora de escopo:

```text
D:\YZIHUB Germania Bandeira\YZIHUB Germania Bandeira
```

## Estrutura da platform

```text
platform/
├── apps/
│   ├── website/          # Site público (placeholder)
│   └── system/           # Sistema / Discovery (placeholder)
├── packages/
│   └── website-content-architecture/
│       ├── src/
│       └── tests/
├── docs/
│   ├── website/
│   ├── system/
│   └── platform/
└── supabase/             # Raiz futura (placeholder)
```

## Responsabilidades

| Fronteira | Responsabilidade | Estado |
|-----------|------------------|--------|
| `apps/website` | Homepage, institucionais, hubs, spokes, SEO, conversão | Placeholder |
| `apps/system` | Discovery, gestão operacional, integrações | Placeholder |
| `packages/website-content-architecture` | Nós de conteúdo, enums, política de publicação | Lote 1 entregue |
| `docs/website` | Baseline e especificação do site público | Entregue |
| `docs/system` | Documentação do sistema (futuro) | Vazio |
| `docs/platform` | Estrutura e migração | Este documento |
| `supabase` | Migrations e config (futuro) | Placeholder |

## Mapa origem → destino

| Origem (Lote 1) | Destino (platform) |
|-----------------|-------------------|
| `docs/architecture/DRA_GERMANIA_WEBSITE_IMPLEMENTATION_BASELINE.md` | `platform/docs/website/DRA_GERMANIA_PUBLIC_WEBSITE_CURRENT_STATE_BASELINE.md` |
| `docs/architecture/DRA_GERMANIA_SEMANTIC_CONTENT_CONTRACT.md` | `platform/docs/website/DRA_GERMANIA_PUBLIC_WEBSITE_CONTENT_ARCHITECTURE_SPECIFICATION.md` |
| `src/content/germania/semantic-content-contract.ts` | `platform/packages/website-content-architecture/src/dra-germania-public-website-content-architecture.ts` |
| `tests/semantic-content-contract.test.mjs` | `platform/packages/website-content-architecture/tests/dra-germania-public-website-content-architecture.test.mjs` |

## Estado transitório

A raiz Git principal continua operacional para:

- Discovery (`src/app/discovery/`, `src/app/page.tsx`)
- Cliente Supabase (`src/lib/supabase/client.ts`)
- Migrations (`supabase/migrations/`)
- Deploy Vercel
- `.env.local`

`platform/` contém contratos e documentação organizados, mas **nenhum app executável** ainda.

## O que permanece na raiz antiga

- Next.js App Router (`src/app/`)
- Discovery Engine completo
- Migrations Supabase
- `package.json` e dependências do projeto principal
- Configuração ESLint, TypeScript, Tailwind
- `.env.local` (não lido nesta unidade)

## Itens fora de escopo desta unidade

- Implementação de rotas do site público
- Public Site Graph
- Homepage
- Sitemap e robots
- Alteração Supabase / migrations
- Deploy
- Atualização Notion / Kanban
- Instalação de dependências
- Commit
- Repositório aninhado

## Estratégia futura de migração

### Lote 2 — Public Site Graph

Derivar grafo publicável a partir de `draGermaniaPublicWebsiteContentNodes` filtrando `published + indexable`. Manter HOLDs e GLP-1 fora.

### Lote 3 — Website estrutural

Criar `apps/website` como app Next.js ou integrar rotas na raiz existente (decisão pendente). Transição da rota `/` para homepage pública sem quebrar Discovery em `/discovery`.

### Discovery → apps/system

Critérios para migrar:

1. Plano de rotas e redirects documentado
2. Testes de sessão Discovery passando
3. Zero duplicação de Supabase client
4. Deploy de staging validado
5. Rollback plan definido

### Supabase → platform/supabase

Critérios:

1. Plano específico aprovado
2. Nenhuma migration duplicada
3. Raiz antiga desativada como canônica somente após validação
4. `.env.local` migrado com cuidado (nunca commitado)

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Confundir raiz Git com repositório aninhado | Documentação explícita; aninhado fora de escopo |
| Duplicar migrations | `platform/supabase/` vazio até plano |
| Quebrar Discovery ao criar homepage | Lote 3 com critério de preservação |
| Publicar HOLDs ou GLP-1 | Testes + política de publicação no pacote |
| Contrato desconectado do runtime | Lote 2 conecta via Public Site Graph |

## Critérios para migrar o Discovery

- [ ] `apps/system` com app funcional equivalente
- [ ] Rotas `/discovery` preservadas ou redirecionadas
- [ ] Sessões Supabase RPC intactas
- [ ] Migrations inalteradas
- [ ] Deploy validado em staging
- [ ] Plano de rollback

## Critérios para iniciar o website

- [ ] Public Site Graph implementado (Lote 2)
- [ ] Templates estruturais (Lote 3)
- [ ] Direção Criativa aprovada (Fase 12) ou fundação neutra reversível
- [ ] HOLDs e GLP-1 preservados nos testes
- [ ] Decisão: app separado vs rotas na raiz existente

## Regra para Supabase

- Raiz canônica atual: `supabase/migrations/` na raiz Git principal
- `platform/supabase/` é reservado; duplicação proibida
- Nenhuma migration nova sem auditoria de necessidade

## Regra para Vercel

- Deploy continua a partir da raiz Git principal
- Nenhuma alteração de configuração Vercel nesta unidade
- Futuro monorepo exige plano de build/deploy separado

## Regra para arquivos de ambiente

- `.env.local` permanece na raiz Git principal
- Não copiar para `platform/`
- Não ler nem alterar nesta unidade
- Variáveis futuras de `apps/website` e `apps/system` exigem plano de segregação
