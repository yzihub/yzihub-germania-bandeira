# apps/system — Sistema da Dra. Germânia

Futuro aplicativo do sistema interno e operacional da Dra. Germânia Bandeira.

## Escopo previsto

- **Discovery:** questionário interativo de onboarding clínico
- **Gestão operacional:** áreas internas de acompanhamento
- **Integrações:** Supabase, Notion, ferramentas de agendamento
- **Áreas internas:** fluxos não públicos

## Estado atual

**Ainda não implementado.** Este diretório é um placeholder de fronteira.

O Discovery permanece na raiz antiga:

- `src/app/discovery/page.tsx` — fluxo completo
- `src/app/page.tsx` — landing que inicia sessão
- `supabase/migrations/` — schema do Discovery Engine

## Regra de migração

O Discovery só deve ser movido para `apps/system/` quando houver plano específico que garanta:

- rotas preservadas ou redirecionadas sem quebra de sessão;
- migrations Supabase intactas;
- deploy Vercel validado;
- ausência de duplicação de código ou banco.
