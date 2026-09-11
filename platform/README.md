# Platform — Dra. Germânia

Nova raiz arquitetural do projeto da Dra. Germânia Bandeira.

## Finalidade

A pasta `platform/` concentra a organização futura do ecossistema digital em fronteiras explícitas, sem substituir imediatamente a raiz Git principal (`D:\YZIHUB Germania Bandeira`), que permanece operacional enquanto a migração avança por lotes.

## Divisão

| Área | Caminho | Responsabilidade |
|------|---------|------------------|
| Site público | `apps/website/` | Homepage, páginas institucionais, hubs, spokes, SEO, conversão |
| Sistema | `apps/system/` | Discovery, gestão operacional, áreas internas, integrações |
| Pacotes compartilhados | `packages/` | Contratos tipados reutilizáveis entre apps |
| Documentação | `docs/` | Especificações, baselines e decisões arquiteturais |
| Supabase | `supabase/` | Raiz futura de migrations e configuração de banco |

## Pacotes compartilhados

`packages/website-content-architecture/` contém a arquitetura de conteúdo e a política de publicação do site público da Dra. Germânia — os 25 nós de conteúdo modelados a partir do Notion (Lote 1).

## Documentação

- `docs/website/` — site público (baseline, arquitetura de conteúdo)
- `docs/system/` — sistema e Discovery (futuro)
- `docs/platform/` — estrutura do repositório e estratégia de migração

## Supabase

`supabase/` é reservado como raiz futura. Nenhuma migration foi movida nesta unidade. A raiz canônica atual (`supabase/migrations/` na raiz Git principal) permanece operacional.

## Estado atual da migração

- **Concluído nesta unidade:** estrutura de diretórios, READMEs de fronteira, documentação do Lote 1, pacote de arquitetura de conteúdo do site público.
- **Permanece na raiz antiga:** Discovery (`src/app/discovery/`), rotas existentes, migrations Supabase, `.env.local`, deploy Vercel.
- **Ainda não implementado:** `apps/website`, `apps/system`, Public Site Graph, conexão runtime do contrato.

## Regra transitória

A raiz Git principal continua operacional temporariamente. Alterações em produção (Discovery, Supabase, deploy) devem ocorrer apenas na raiz antiga até que um lote específico autorize a migração de cada componente.
