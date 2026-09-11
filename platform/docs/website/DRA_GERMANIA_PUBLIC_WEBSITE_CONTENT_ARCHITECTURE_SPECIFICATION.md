# DRA_GERMANIA_PUBLIC_WEBSITE_CONTENT_ARCHITECTURE_SPECIFICATION

Arquitetura de conteúdo e política de publicação do site público da Dra. Germânia.

Status: Lote 1 — organizado em `platform/`.

Fonte canonica local: `platform/packages/website-content-architecture/src/dra-germania-public-website-content-architecture.ts`.

## Objetivo

Esta especificação transforma a arquitetura estrategica aprovada no Notion em uma fonte tecnica tipada, versionavel e independente da UI para o site público da Dra. Germânia. Ela deve permitir que etapas futuras derivem rotas, navegacao contextual, SEO tecnico, schema, sitemap e tracking sem espalhar strings soltas por componentes.

## Autoridade do Notion

O Notion permanece como fonte estrategica de verdade. Esta arquitetura de conteúdo do site público nao redesenha a estrategia; apenas materializa localmente o que foi aprovado nas Fases 06-11.

Regra de precedencia:

1. Restricoes regulatorias, medicas e documentais.
2. Website Blueprint.
3. Sitemap e Launch Set.
4. URL + Internal Linking Contract.
5. Keyword + Search Intent Map.
6. Silos, hubs e spokes.
7. Entidades e clusters.
8. Codigo local existente.

## Localizacao escolhida

A arquitetura de conteúdo do site público foi colocada em `platform/packages/website-content-architecture/` porque representa conteudo e arquitetura de dominio do site público, fica fora de `src/app`, evita acoplamento com rotas e nao depende de React, Next.js, Supabase ou APIs de browser.

## Modelo de dados

Cada nó de conteúdo do site público no Semantic Content Map possui `page_id`, `content_node_id`, `silo_id`, `hub_id`, `page_type`, `internal_title`, `canonical_topic`, `slug`, `parent`, `primary_intent`, `supporting_intents`, `priority`, `publication_status`, `indexability`, `must_link_to`, `should_receive_links_from`, `do_not_compete_with`, `conversion_goal`, `cta_id`, `schema_type`, `credential_status`, `review_status` e `source_refs`.

## Enums

Estados editoriais da política de publicação do site público: `planned`, `draft`, `published`, `archived`, `hold`.

Estados de revisao: `draft`, `review_required`, `approved`, `rejected`, `stale`, `hold`.

Tipos de pagina do site público: `home`, `institutional`, `conversion`, `legal`, `hub`, `spoke`, `strategic_context`.

## Identidade estavel

`page_id` identifica a pagina/ativo operacional. `content_node_id` identifica o nó de conteúdo do site público e nao deve mudar se o titulo de apresentacao mudar. `silo_id` identifica o territorio de autoridade. `hub_id` identifica o hub ao qual o no pertence ou que o governa.

## Entidade, no e rota

Entidade e um conceito estrategico, como `Composicao corporal`. Nó de conteúdo do site público e uma decisao editorial ou estrutural modelada na arquitetura, como `Bioimpedancia`. Rota e uma URL publica ou futura, como `/composicao-corporal/bioimpedancia/`.

Nem toda entidade vira rota. Itens `HOLD`, `planned` ou `draft` podem existir no Semantic Content Map sem entrar no site publico.

## Semantic Content Map x Public Site Graph

Semantic Content Map contem o conjunto completo de nós de conteúdo do site público modelados nesta fase, incluindo `planned`, `draft` e `hold`.

Public Site Graph devera conter somente `published + indexable`. Nesta unidade, o Public Site Graph ainda nao foi implementado.

## Politica de publicacao do site público

Na realidade atual desta unidade, nenhuma pagina publica nova do Launch Set foi implementada. Portanto, nenhum nó de conteúdo do site público deve ser marcado como `published`.

Regras:

- `published` exige rota publica real, conteudo suficiente, canonical valido e indexabilidade aprovada.
- `hold` nunca entra no grafo publico.
- `draft` e `planned` nao criam URL publica indexavel.
- `review_required`, `stale` ou `hold` nao podem ser publicados automaticamente.

## HOLDs

Permanecem em `HOLD`: Nutrologia como titulo/landing publica, Joao Pessoa local, Campina Grande local, Semaglutida isolada, Tirzepatida isolada, Comparativos farmacologicos, Lipedema como core, Saude hormonal generica, Suplementacao como hub e Longevidade como hub.

## Credential Gate

CRM, RQE, formacao, cargos, vinculos, enderecos e operacao local ainda precisam de verificacao documental. Sem RQE validado, o sistema nao deve publicar `Nutrologa`, `especialista em Nutrologia` ou equivalentes como titulo profissional. Paginas locais permanecem `HOLD` ate confirmacao factual.

## YMYL

Conteudos clinicos do site público devem suportar author, medical_reviewer, source_refs, published_at, last_reviewed_at, next_review_at, credential_status e regulatory_check.

Farmacoterapia / GLP-1 permanece condicionada a review medico/regulatorio. A arquitetura de conteúdo pode modelar o no, mas nao aprova publicacao.

O sistema nao deve diagnosticar, prescrever, sugerir dose, garantir resultado, criar promessa clinica ou converter hipotese estrategica em fato.

## Regras anti-canibalizacao

- Cada conteudo deve nascer com um territorio-pai dominante.
- Spokes apontam para hub-pai.
- Spokes podem apontar para hubs irmaos somente quando semanticamente justificado.
- Sinonimos nao viram paginas separadas automaticamente.
- `Efeito sanfona`, `reganho` e `manutencao` ficam consolidados.
- `Sintomas`, `HOMA-IR` e exames ficam consolidados inicialmente em resistencia a insulina.
- `Semaglutida`, `tirzepatida`, marcas e comparativos nao comandam arquitetura evergreen.
- Bioimpedancia e instrumento, nao silo.
- Saude hormonal generica, lipedema, suplementacao e longevidade nao viram hubs nesta arquitetura.

## Exemplos de uso

Futuras rotas do site público poderao importar a arquitetura de conteúdo e localizar um no por `content_node_id`.

Futuros testes poderao validar unicidade de `slug`, existencia de `parent`, relacionamento de spokes com hubs e bloqueio de HOLDs.

Futuros geradores de sitemap e robots deverao derivar apenas de nós de conteúdo do site público com `published + indexable`.

## Decisoes adiadas

Public Site Graph, templates visuais, rotas, troca da landing atual da raiz pela home publica, sitemap, robots, canonical, schema, tracking runtime, Supabase para persistencia da arquitetura de conteúdo, migrations de conteudo e Direcao Criativa.

## Limites desta unidade

Esta unidade entrega somente organizacao dos artefatos do Lote 1 em `platform/`, documentacao da arquitetura de conteúdo do site público, testes focados nos nós de conteúdo e validacoes locais. Nao avanca para Lote 2.
