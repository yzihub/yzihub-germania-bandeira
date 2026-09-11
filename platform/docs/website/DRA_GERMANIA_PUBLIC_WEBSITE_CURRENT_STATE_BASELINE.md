# DRA_GERMANIA_PUBLIC_WEBSITE_CURRENT_STATE_BASELINE

Estado atual do site público da Dra. Germânia — baseline técnico da Fase A.

Status: Fase A aprovada e fechada para a unidade atual.

Data de referencia: 2026-09-11.

## Raiz Git principal

A raiz Git principal autorizada para o projeto é:

```text
D:\YZIHUB Germania Bandeira
```

A nova raiz arquitetural do site público e do sistema é:

```text
D:\YZIHUB Germania Bandeira\platform
```

O diretorio abaixo está completamente fora de escopo:

```text
D:\YZIHUB Germania Bandeira\YZIHUB Germania Bandeira
```

Não ler, editar, mover, apagar, consolidar nem executar comandos Git dentro do repositório aninhado nesta unidade.

## Fonte estrategica

O Notion permanece como fonte estrategica de verdade. O repositorio local permanece como fonte tecnica de verdade.

Fontes Notion lidas em modo somente leitura durante a Fase A:

- Pagina principal: `https://app.notion.com/p/3ccf8a4adecd81ff9d40ce8a14c08fc9`
- Fase 06: `https://app.notion.com/p/3d8f8a4adecd81198817f67e4541a633`
- Fase 07: `https://app.notion.com/p/3d8f8a4adecd81a49395dc817072ec03`
- Fase 08: `https://app.notion.com/p/3d8f8a4adecd8195a967ee35d5fd721c`
- Fase 09: `https://app.notion.com/p/3d8f8a4adecd818eb50feff0219abeb5`
- Fase 10: `https://app.notion.com/p/3d8f8a4adecd81b6be88cf7b4c7409b6`
- Fase 11: `https://app.notion.com/p/3d8f8a4adecd81f8ba7ef48b0a63c3e5`
- Kanban: `https://app.notion.com/p/7a5c618826a9459fb3aeb18f703164ac`

## Stack confirmada

- Next.js: `16.3.3`
- React: `19.2.8`
- React DOM: `19.2.8`
- TypeScript: `^5`
- Tailwind CSS: `^4`
- ESLint: `^9`
- Supabase JS: `^2.112.4`
- Node usado na auditoria: `v24.18.0`
- npm usado na auditoria: `11.16.0`

## Rotas existentes

- `/`: implementada em `src/app/page.tsx`, atualmente landing do Discovery.
- `/discovery`: implementada em `src/app/discovery/page.tsx`, fluxo interativo do Discovery.

Decisao congelada: o Discovery permanece em `/discovery`. A rota `/` sera ocupada futuramente pela homepage publica do site público da Dra. Germânia, mas a landing atual da raiz nao deve ser removida nem substituida nesta unidade. Essa alteracao pertence ao Lote 3.

## Arquitetura encontrada

O projeto usa Next.js App Router em `src/app`.

Arquivos principais:

- `src/app/layout.tsx`: layout global e metadata global ainda orientada ao Discovery.
- `src/app/page.tsx`: landing que inicia ou retoma sessao do Discovery via Supabase RPC.
- `src/app/discovery/page.tsx`: questionario completo com progresso, capitulos, respostas, uploads e conclusao.
- `src/app/globals.css`: sistema visual editorial do Discovery.
- `src/components/Mark.tsx`: marca editorial desenhada usada pelo Discovery.
- `src/lib/supabase/client.ts`: cliente Supabase usado pelo app.
- `src/app/lib/supabase/client.ts`: duplicacao do cliente Supabase, aparentemente nao usada pela rota atual.
- `supabase/migrations`: migrations do Discovery Engine e upload.

## Diferencas entre Notion e repositorio

O Notion ja define a arquitetura estrategica aprovada: entidades e clusters, silos, hubs e spokes, decisions `PAGE`, `SECTION` e `HOLD`, contrato de URLs e internal linking, sitemap e launch set, Website Blueprint, governanca YMYL e tracking conceitual.

O repositorio local ainda implementa essencialmente o Discovery Engine. A arquitetura de conteúdo do site público foi modelada em `platform/packages/website-content-architecture/`, mas ainda nao existem Public Site Graph, rotas publicas do Launch Set, templates reutilizaveis do site publico, breadcrumbs, sitemap, robots, schema, contratos de tracking e testes de governanca da arvore conectados ao runtime.

## Arquivos reutilizaveis

- `src/app/discovery/page.tsx`: preservar como fluxo Discovery.
- `src/app/page.tsx`: preservar nesta unidade; sera tratado no Lote 3.
- `src/lib/supabase/client.ts`: reutilizavel para Discovery e futuras integracoes, com cuidado para nao vazar segredos.
- `supabase/migrations/*`: preservar integralmente.

## Arquivos que nao devem ser reutilizados automaticamente

- `src/components/Mark.tsx`: pertence ao sistema visual do Discovery; nao promover automaticamente para identidade publica.
- `src/app/globals.css`: contem paleta, tipografia e motion do Discovery; nao congelar como Direcao Criativa do site publico.
- `src/app/layout.tsx`: metadata atual e de Discovery; precisa ser revisada em lote futuro.
- `public/*.svg`: assets padrao do create-next-app, nao relevantes para identidade.

## Conflitos

- A rota `/` hoje abre a landing do Discovery, mas o contrato estrategico exige que `/` seja futuramente a home publica do site público da Dra. Germânia.
- A metadata global ainda descreve o Discovery, nao o site publico.
- Ha cliente Supabase duplicado em dois caminhos.
- Existe repositorio aninhado fora de escopo, com `.git` proprio e migrations parciais.

## Riscos

- Confundir a raiz Git principal com o repositorio aninhado.
- Quebrar o Discovery ao introduzir a home publica.
- Publicar conteudo medico antes de review.
- Marcar como `published` paginas que ainda nao existem.
- Criar rotas para itens `HOLD`.
- Promover visual do Discovery como identidade definitiva.
- Criar migrations antes de auditar necessidade real.

## Decisoes congeladas

- A raiz Git principal e `D:\YZIHUB Germania Bandeira`.
- A nova raiz arquitetural e `platform/`.
- O repositorio aninhado esta fora de escopo.
- O Discovery permanece em `/discovery`.
- A rota `/` sera ocupada futuramente pela home publica do site público, mas nao nesta unidade.
- O sistema visual atual do Discovery nao e Direcao Criativa aprovada do site publico.
- Fase 12 continua aguardando insumos externos.
- Fundacao visual futura deve ser neutra e reversivel.

## HOLDs do site público

Permanecem em `HOLD`:

- Nutrologia/Nutrologa como titulo ou landing publica;
- paginas locais de Joao Pessoa;
- paginas locais de Campina Grande;
- semaglutida isolada;
- tirzepatida isolada;
- marcas comerciais;
- comparativos farmacologicos;
- lipedema como core;
- saude hormonal generica;
- suplementacao como hub;
- longevidade como hub.

## Lotes atomicos aprovados

1. Lote 1: arquitetura de conteúdo tipada do site público e documentacao tecnica.
2. Lote 2: Public Site Graph e politica de publicacao do site público.
3. Lote 3: templates e rotas estruturais, incluindo transicao da raiz.
4. Lote 4: hubs.
5. Lote 5: spokes e contextos.
6. Lote 6: internal linking e breadcrumbs.
7. Lote 7: metadata, schema, robots e sitemap.
8. Lote 8: conversao e contratos de tracking.
9. Lote 9: testes, QA e documentacao.
10. Lote 10: preview/screenshot e checkpoint final.

## Criterios de aceite por lote

- Lote 1: todos os nós de conteúdo do site público modelados com identificadores estaveis, enums validos, `source_refs`, status atual real e `HOLDs` preservados.
- Lote 2: Public Site Graph derivado apenas de `published + indexable`, sem GLP-1 aprovado e sem HOLDs publicos.
- Lote 3: Discovery preservado em `/discovery`; raiz preparada para home publica sem quebrar sessao existente.
- Lote 4: hubs autorizados materializados sem inventar paginas.
- Lote 5: spokes e contextos autorizados, com GLP-1 condicionado.
- Lote 6: nenhuma pagina prioritaria orfa; spokes apontam para hub-pai.
- Lote 7: SEO tecnico derivado da arquitetura de conteúdo, sem sinais especulativos.
- Lote 8: tracking conceitual com IDs estaveis, sem conectar contas reais.
- Lote 9: testes cobrindo governanca da arvore.
- Lote 10: QA local verificavel antes de qualquer entrega visual final.

## Declaracoes de seguranca

- `.env.local` nao foi lido.
- Nenhuma migration foi criada, alterada ou aplicada durante a Fase A.
- Nenhum banco remoto foi alterado.
- Nenhum dado remoto foi modificado.
- Nenhum deploy foi executado.
- As Fases 06-11 do Notion nao foram reescritas.
