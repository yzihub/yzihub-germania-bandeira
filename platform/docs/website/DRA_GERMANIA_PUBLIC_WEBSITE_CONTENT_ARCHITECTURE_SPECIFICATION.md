# DRA_GERMANIA_PUBLIC_WEBSITE_CONTENT_ARCHITECTURE_SPECIFICATION

Arquitetura de conteúdo e política de publicação do site público da Dra. Germânia.

Status: Lote 2 — Preview Site Graph e Public Site Graph implementados.

Fonte canônica local: `platform/packages/website-content-architecture/`.

Pacote: `@dra-germania/public-website-content-architecture`.

## Objetivo

Esta especificação transforma a arquitetura estratégica aprovada no Notion em uma fonte técnica tipada, versionável e independente da UI para o site público da Dra. Germânia. Ela permite derivar Preview Site Graph, Public Site Graph, rotas futuras, navegação contextual, SEO técnico, schema, sitemap e tracking sem espalhar strings soltas por componentes.

## Autoridade do Notion

O Notion permanece como fonte estratégica de verdade. Esta arquitetura de conteúdo do site público não redesenha a estratégia; apenas materializa localmente o que foi aprovado nas Fases 06–11.

Regra de precedência:

1. Restrições regulatórias, médicas e documentais.
2. Website Blueprint.
3. Sitemap e Launch Set.
4. URL + Internal Linking Contract.
5. Keyword + Search Intent Map.
6. Silos, hubs e spokes.
7. Entidades e clusters.
8. Código local existente.

## Localização

`platform/packages/website-content-architecture/` — pacote autocontido, fora de `src/app`, sem dependência de React, Next.js, Supabase ou APIs de browser.

## Três camadas de grafo

### Semantic Content Map

Conjunto canônico completo de nós de conteúdo do site público. Contém todos os estados editoriais: `planned`, `draft`, `published`, `archived`, `hold`.

- **25 nós** modelados atualmente.
- Fonte de verdade — nunca derivada de filesystem ou rotas.
- Módulo: `dra-germania-public-website-content-nodes.ts`.

### Preview Site Graph

Visão derivada para **desenvolvimento e revisão editorial**. Não representa produção.

| Inclui | Exclui |
|--------|--------|
| `draft` | `planned` |
| `published` | `hold` |
| | `archived` |

Regras adicionais:

- Nunca promove indexabilidade.
- Não altera `publication_status` nem dados canônicos.
- Seletor: `deriveDraGermaniaPublicWebsitePreviewSiteGraph()`.

**Estado atual:** 14 nós (`draft` do Launch Set). Zero nós `published` canônicos.

### Public Site Graph

Visão derivada exclusiva de **produção pública**. Representa somente o que pode existir publicamente.

Requisitos cumulativos:

```
publication_status = published
AND indexability = public_indexable
AND review_status = approved
AND credential gate resolvido (verified ou not_applicable)
AND gates YMYL resolvidos quando aplicável
AND nó não está na lista de exclusão estratégica
```

Exclusões estratégicas permanentes (até decisão contrária documentada):

- `context_farmacoterapia_glp1` (GLP-1)
- `hold_nutrologia_titulo_landing` (Nutrologia)
- `local_joao_pessoa`, `local_campina_grande` (páginas locais)

Seletor: `deriveDraGermaniaPublicWebsitePublicSiteGraph()`.

**Estado atual:** grafo **vazio** — comportamento correto. Nenhum nó canônico está `published`.

## Política de indexabilidade

Valores explícitos (substituem booleano ambíguo):

| Valor | Significado |
|-------|-------------|
| `public_indexable` | Indexável em produção — exige `published + approved` |
| `public_noindex` | Pública mas com `noindex` — fora do Public Site Graph |
| `preview_only` | Visível apenas no Preview Site Graph |
| `not_public` | Não exposta — estado atual de todos os nós canônicos |

Produção exige exclusivamente `public_indexable`.

## Política de seleção

Funções puras em `dra-germania-public-website-publication-policy.ts`:

| Função | Responsabilidade |
|--------|------------------|
| `isDraGermaniaPublicWebsiteNodeEligibleForPreview` | Elegibilidade preview |
| `isDraGermaniaPublicWebsiteNodeEligibleForProduction` | Elegibilidade produção |
| `deriveDraGermaniaPublicWebsitePreviewSiteGraph` | Deriva Preview Site Graph |
| `deriveDraGermaniaPublicWebsitePublicSiteGraph` | Deriva Public Site Graph |
| `validateDraGermaniaPublicWebsiteContentArchitecture` | Valida integridade estrutural |

Nenhum seletor acessa `process.env`, filesystem, rede, Notion, banco ou Next.js.

## Requisitos de revisão

| review_status | Preview | Produção |
|---------------|---------|----------|
| `draft` | draft elegível | excluído |
| `review_required` | draft/publication elegível | excluído |
| `approved` | elegível se published | elegível se demais gates OK |
| `rejected` | excluído de produção | excluído |
| `stale` | excluído de produção | excluído |
| `hold` | excluído | excluído |

## Requisitos de credenciais

| credential_status | Produção |
|-------------------|----------|
| `not_applicable` | permitido |
| `verified` | permitido |
| `pending_verification` | **excluído** |
| `hold` | **excluído** |

## Gates YMYL

Conteúdos com `schema_type` `MedicalWebPage` ou `Article` exigem adicionalmente:

- `medical_review_status = approved`
- `regulatory_check_status = approved`

Campos estruturais adicionados no Lote 2 com estado `pending` — nós YMYL permanecem fora da produção até aprovação explícita. Nenhum dado positivo inventado.

## Comportamento com grafos vazios

| Grafo | Nós atuais | Correto? |
|-------|------------|----------|
| Semantic Content Map | 25 | sim |
| Preview Site Graph | 14 (`draft`) | sim |
| Public Site Graph | 0 | sim — nenhum nó `published` |

Grafos vazios ou parciais **não são falha** — refletem a realidade editorial atual.

## Por que não promover nós automaticamente

- Existência de rota ou arquivo `page.tsx` **não autoriza publicação**.
- Promoção `planned → draft → published` é decisão editorial explícita.
- Seletores nunca mutam nós canônicos.
- Public Site Graph nunca infere estado a partir do filesystem.

## Transições editoriais (documentadas, não executadas nesta unidade)

```
planned → draft     quando iniciarmos implementação real do website (Lote 3+)
draft → preview     presença automática no Preview Site Graph
draft → published   somente após conteúdo, design, QA, credenciais e revisão
published → archived remoção do Public Site Graph; preservação no Semantic Content Map
hold                permanente até decisão estratégica documentada
```

## Regras para archived

- Excluído de Preview Site Graph e Public Site Graph.
- Permanece no Semantic Content Map para histórico e auditoria.
- Nunca reintroduzido automaticamente.

## Regras para hold

- Excluído de Preview Site Graph e Public Site Graph.
- Nunca indexável (`public_indexable` proibido).
- GLP-1: `hold + review_required + not_public` — permanece fora de ambos os grafos.

## HOLDs estratégicos (10 + GLP-1)

Nutrologia, João Pessoa, Campina Grande, Semaglutida, Tirzepatida, Comparativos farmacológicos, Lipedema, Saúde hormonal genérica, Suplementação, Longevidade — mais GLP-1 como contexto condicionado.

## Responsabilidade futura do website

`platform/apps/website` (app Next.js separado) consumirá:

- Semantic Content Map para metadados e navegação
- Preview Site Graph em ambiente de desenvolvimento/staging
- Public Site Graph para sitemap, robots e rotas de produção

## Responsabilidade futura do system

`platform/apps/system` (Discovery e áreas internas) **não consome** Public Site Graph. Permanece independente até migração reversível da raiz antiga.

## Decisão arquitetural: dois apps separados

- Site público: `platform/apps/website` — **não** como rotas da aplicação antiga.
- Sistema: `platform/apps/system` — Discovery migrado futuramente da raiz.

## Limites desta unidade (Lote 2)

Entregue:

- Pacote autocontido com `package.json` local
- Separação types / nodes / policy / index
- Preview Site Graph e Public Site Graph
- Testes de governança com fixtures
- Documentação atualizada

Não entregue:

- App Next.js do website
- Migração do Discovery
- Rotas, páginas, sitemap, robots
- Alteração Supabase, Notion, Vercel
- Promoção de nós para `draft` ou `published`

## Próximo passo (Lote 3)

Templates e rotas estruturais no app `platform/apps/website`, transição da rota `/` sem quebrar Discovery na raiz antiga.
