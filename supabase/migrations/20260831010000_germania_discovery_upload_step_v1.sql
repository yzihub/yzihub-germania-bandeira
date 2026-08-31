-- Adds the missing (and optional) file-upload step to the Germania discovery
-- template. The upload renderer, the private bucket, reserve/finalize RPCs and
-- discovery_uploads already existed, but no question of type 'upload' was ever
-- seeded, so the step could never be reached by a respondent.
--
-- This migration is additive and idempotent:
--   * no existing question_key is renamed, retyped or deleted;
--   * no existing prompt/help_text/options are changed;
--   * only `position` shifts for the questions that come after 'acervo', so the
--     new step lands right after the current inventory questions.
-- Existing answers reference question_id, so the shift cannot lose data.

do $$
declare
  v_template_key   constant text    := 'germania-bandeira-v1';
  v_template_ver   constant integer := 1;
  v_new_key        constant text    := 'envio_acervo';
  v_insert_at      integer;
begin
  if exists (
    select 1
    from public.discovery_questions
    where template_key = v_template_key
      and template_version = v_template_ver
      and question_key = v_new_key
  ) then
    return;
  end if;

  -- Land immediately after the last existing question of the 'acervo' section.
  select max(position) + 1
    into v_insert_at
  from public.discovery_questions
  where template_key = v_template_key
    and template_version = v_template_ver
    and section_key = 'acervo';

  if v_insert_at is null then
    raise exception 'acervo section not found for template %', v_template_key;
  end if;

  -- Open a slot. Two passes because (template_key, template_version, position)
  -- is a non-deferrable unique constraint and `position` has a `> 0` check,
  -- so a single in-place increment would collide.
  update public.discovery_questions
  set position = position + 1000
  where template_key = v_template_key
    and template_version = v_template_ver
    and position >= v_insert_at;

  update public.discovery_questions
  set position = position - 999
  where template_key = v_template_key
    and template_version = v_template_ver
    and position > 1000;

  insert into public.discovery_questions (
    template_key,
    template_version,
    section_key,
    question_key,
    position,
    question_type,
    prompt,
    help_text,
    required,
    options,
    conditions,
    metadata
  ) values (
    v_template_key,
    v_template_ver,
    'acervo',
    v_new_key,
    v_insert_at,
    'upload',
    'Se quiser, já pode nos enviar alguns materiais',
    'Fotos, vídeos, apresentações, documentos ou outros arquivos que ajudem a contar melhor sua história podem ser enviados agora. Se preferir, também podemos organizar isso depois.',
    false,
    '[]'::jsonb,
    '[]'::jsonb,
    jsonb_build_object(
      'multiple', true,
      'optional_step', true,
      'cta_label', 'Adicionar arquivos',
      'cta_label_more', 'Adicionar mais arquivos',
      'accept_hint', 'PDF, DOCX, JPG, PNG, WEBP, MP4 ou MOV · até 50 MB por arquivo',
      'answer_shape', 'upload_ids'
    )
  );
end
$$;

-- The frontend already derives the question counter from the template payload,
-- but this metadata field was still hardcoded at 48.
update public.discovery_projects p
set metadata = p.metadata || jsonb_build_object(
  'question_count', (
    select count(*)
    from public.discovery_questions q
    where q.template_key = p.template_key
      and q.template_version = p.template_version
  ),
  'chapters', (
    select count(distinct q.section_key)
    from public.discovery_questions q
    where q.template_key = p.template_key
      and q.template_version = p.template_version
  )
)
where p.slug = 'germania-bandeira';

comment on column public.discovery_answers.value is
  'Answer payload. For question_type = ''upload'' this stores only a light reference — {"status": "ready"|"skipped", "upload_ids": [...]}. File metadata (filename, mime, size, bucket, object_path, Storage metadata) is owned by discovery_uploads.';
