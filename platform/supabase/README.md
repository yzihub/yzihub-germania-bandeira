# supabase — Raiz futura de Supabase

Reservado como raiz futura de configuração e migrations Supabase para o ecossistema `platform/`.

## Estado atual

**Vazio intencionalmente.** Nenhuma migration foi movida nesta unidade.

A raiz canônica atual permanece em:

```text
D:\YZIHUB Germania Bandeira\supabase\migrations\
```

## Regras

- **Duplicação de migrations é proibida.** Nunca copiar migrations para `platform/supabase/` enquanto a raiz antiga for canônica.
- **Não aplicar migrations** desta pasta até plano específico de migração.
- **Não alterar** `.env.local` nem credenciais remotas durante a organização.

## Migração futura

Exige plano específico que defina:

1. qual app consome qual schema;
2. se Discovery e site público compartilham projeto Supabase;
3. estratégia de deploy e rollback;
4. validação de que nenhuma migration existente será perdida ou duplicada.
