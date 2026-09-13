# @dra-germania/public-website-content-architecture

Arquitetura de conteúdo e política de publicação do site público da Dra. Germânia.

Pacote autocontido — sem dependências externas. Consumidor principal futuro: `platform/apps/website`.

## Estrutura

```text
src/
├── dra-germania-public-website-content-types.ts   # tipos, enums, invariantes
├── dra-germania-public-website-content-nodes.ts   # 25 nós canônicos
├── dra-germania-public-website-publication-policy.ts  # seletores e grafos
└── index.ts                                       # API pública

tests/
├── dra-germania-public-website-content-architecture.test.mjs
├── dra-germania-public-website-preview-graph.test.mjs
├── dra-germania-public-website-production-graph.test.mjs
└── fixtures/graph-test-nodes.mjs
```

## Executar testes locais

A partir deste diretório:

```bash
npm test
```

Ou diretamente:

```bash
node --test tests/*.test.mjs
```

## API pública

| Export | Responsabilidade |
|--------|------------------|
| `draGermaniaPublicWebsiteContentNodes` | Semantic Content Map (25 nós) |
| `deriveDraGermaniaPublicWebsitePreviewSiteGraph` | Preview Site Graph |
| `deriveDraGermaniaPublicWebsitePublicSiteGraph` | Public Site Graph |
| `isDraGermaniaPublicWebsiteNodeEligibleForPreview` | Elegibilidade preview |
| `isDraGermaniaPublicWebsiteNodeEligibleForProduction` | Elegibilidade produção |
| `validateDraGermaniaPublicWebsiteContentArchitecture` | Validação estrutural |

## Grafos derivados

| Grafo | Finalidade | Estado atual |
|-------|------------|--------------|
| Semantic Content Map | Fonte canônica completa | 25 nós |
| Preview Site Graph | Desenvolvimento e revisão | 14 nós (`draft`) |
| Public Site Graph | Produção pública | **vazio** (correto) |

## O que não contém

- Rotas Next.js ou app em `apps/website`
- Componentes React
- Persistência Supabase
- Sitemap, robots, schema runtime
- Conexão com Notion ou banco

## Relação com o Notion

O Notion permanece como fonte estratégica de verdade (Fases 06–11). Este pacote materializa localmente o aprovado, com `source_refs` apontando para as fases relevantes.

## Estado

Lote 2 concluído — pacote autocontido com Preview Site Graph e Public Site Graph. **Ainda não conectado ao runtime.**
