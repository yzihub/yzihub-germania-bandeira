# website-content-architecture

Arquitetura de conteúdo e política de publicação do site público da Dra. Germânia.

## Consumidor principal

Site público (`apps/website/` — futuro).

## Função

Materializa localmente o Semantic Content Map aprovado no Notion como fonte técnica tipada, versionável e independente de UI, rotas ou runtime.

## O que contém

- `src/dra-germania-public-website-content-architecture.ts` — 25 nós de conteúdo do site público, enums, tipos exportados
- `tests/dra-germania-public-website-content-architecture.test.mjs` — validação de integridade dos nós

## O que não contém

- Rotas Next.js
- Componentes React
- Public Site Graph (Lote 2)
- Persistência Supabase
- Sitemap, robots, schema runtime
- Lógica de renderização ou conversão

## Relação com o Notion

O Notion permanece como fonte estratégica de verdade (Fases 06–11). Este pacote não redesenha a estratégia — apenas materializa localmente o que foi aprovado, com `source_refs` apontando para as fases relevantes.

## Semantic Content Map vs Public Site Graph

| Conceito | Conteúdo | Status |
|----------|----------|--------|
| Semantic Content Map | Todos os 25 nós (`draft`, `planned`, `hold`) | Implementado neste pacote |
| Public Site Graph | Somente `published + indexable` | Ainda não implementado (Lote 2) |

## Estado atual

Contrato tipado entregue no Lote 1 e organizado nesta unidade. **Ainda não conectado ao runtime** — nenhum import em `src/app/` ou componente de produção.
