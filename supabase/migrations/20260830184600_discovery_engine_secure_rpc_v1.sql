create or replace function public.discovery_token_hash(p_token text)
returns text
language sql
immutable
strict
security invoker
set search_path = public, extensions
as $$
  select encode(extensions.digest(p_token::text, 'sha256'::text), 'hex')
$$;

create or replace function public.get_discovery_template(p_project_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_project public.discovery_projects%rowtype;
  v_questions jsonb;
begin
  select * into v_project
  from public.discovery_projects
  where slug = p_project_slug
    and status in ('draft','active')
  limit 1;

  if v_project.id is null then
    raise exception 'discovery_project_not_found';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'section_key', q.section_key,
      'question_key', q.question_key,
      'position', q.position,
      'question_type', q.question_type,
      'prompt', q.prompt,
      'help_text', q.help_text,
      'required', q.required,
      'options', q.options,
      'conditions', q.conditions,
      'metadata', q.metadata
    ) order by q.position
  ), '[]'::jsonb)
  into v_questions
  from public.discovery_questions q
  where q.template_key = v_project.template_key
    and q.template_version = v_project.template_version;

  return jsonb_build_object(
    'project', jsonb_build_object(
      'id', v_project.id,
      'slug', v_project.slug,
      'name', v_project.name,
      'template_key', v_project.template_key,
      'template_version', v_project.template_version,
      'metadata', v_project.metadata
    ),
    'questions', v_questions
  );
end;
$$;

create or replace function public.start_discovery_session(
  p_project_slug text,
  p_respondent_name text default null,
  p_respondent_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_project public.discovery_projects%rowtype;
  v_session public.discovery_sessions%rowtype;
  v_token text;
begin
  select * into v_project
  from public.discovery_projects
  where slug = p_project_slug
    and status in ('draft','active')
  limit 1;

  if v_project.id is null then
    raise exception 'discovery_project_not_found';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.discovery_sessions (
    project_id,
    respondent_name,
    respondent_email,
    status,
    progress_percent,
    resume_token_hash,
    metadata
  ) values (
    v_project.id,
    nullif(btrim(p_respondent_name), ''),
    nullif(lower(btrim(p_respondent_email)), ''),
    'started',
    0,
    public.discovery_token_hash(v_token),
    jsonb_build_object('created_via', 'public_rpc')
  )
  returning * into v_session;

  return jsonb_build_object(
    'session_id', v_session.id,
    'resume_token', v_token,
    'status', v_session.status,
    'progress_percent', v_session.progress_percent,
    'started_at', v_session.started_at
  );
end;
$$;

create or replace function public.get_discovery_session(
  p_session_id uuid,
  p_resume_token text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_session public.discovery_sessions%rowtype;
  v_project public.discovery_projects%rowtype;
  v_answers jsonb;
begin
  select * into v_session
  from public.discovery_sessions
  where id = p_session_id
    and resume_token_hash = public.discovery_token_hash(p_resume_token)
  limit 1;

  if v_session.id is null then
    raise exception 'invalid_discovery_session';
  end if;

  select * into v_project
  from public.discovery_projects
  where id = v_session.project_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'question_id', a.question_id,
      'question_key', q.question_key,
      'value', a.value,
      'answered_at', a.answered_at
    ) order by q.position
  ), '[]'::jsonb)
  into v_answers
  from public.discovery_answers a
  join public.discovery_questions q on q.id = a.question_id
  where a.session_id = v_session.id;

  return jsonb_build_object(
    'session', jsonb_build_object(
      'id', v_session.id,
      'status', v_session.status,
      'current_section_key', v_session.current_section_key,
      'current_question_key', v_session.current_question_key,
      'progress_percent', v_session.progress_percent,
      'respondent_name', v_session.respondent_name,
      'respondent_email', v_session.respondent_email,
      'started_at', v_session.started_at,
      'completed_at', v_session.completed_at,
      'last_activity_at', v_session.last_activity_at
    ),
    'project', jsonb_build_object(
      'slug', v_project.slug,
      'name', v_project.name,
      'template_key', v_project.template_key,
      'template_version', v_project.template_version
    ),
    'answers', v_answers
  );
end;
$$;

create or replace function public.save_discovery_answer(
  p_session_id uuid,
  p_resume_token text,
  p_question_key text,
  p_value jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session public.discovery_sessions%rowtype;
  v_project public.discovery_projects%rowtype;
  v_question public.discovery_questions%rowtype;
  v_answered_count integer;
  v_total_count integer;
  v_progress numeric(5,2);
begin
  select * into v_session
  from public.discovery_sessions
  where id = p_session_id
    and resume_token_hash = public.discovery_token_hash(p_resume_token)
  for update;

  if v_session.id is null then
    raise exception 'invalid_discovery_session';
  end if;

  if v_session.status = 'completed' then
    raise exception 'discovery_session_completed';
  end if;

  select * into v_project
  from public.discovery_projects
  where id = v_session.project_id;

  select * into v_question
  from public.discovery_questions
  where template_key = v_project.template_key
    and template_version = v_project.template_version
    and question_key = p_question_key
  limit 1;

  if v_question.id is null then
    raise exception 'discovery_question_not_found';
  end if;

  if p_value is null then
    raise exception 'discovery_answer_value_required';
  end if;

  insert into public.discovery_answers (
    session_id,
    question_id,
    value,
    answered_at,
    metadata
  ) values (
    v_session.id,
    v_question.id,
    p_value,
    now(),
    '{}'::jsonb
  )
  on conflict (session_id, question_id)
  do update set
    value = excluded.value,
    answered_at = now(),
    updated_at = now();

  select count(*) into v_total_count
  from public.discovery_questions q
  where q.template_key = v_project.template_key
    and q.template_version = v_project.template_version;

  select count(*) into v_answered_count
  from public.discovery_answers a
  join public.discovery_questions q on q.id = a.question_id
  where a.session_id = v_session.id
    and q.template_key = v_project.template_key
    and q.template_version = v_project.template_version;

  v_progress := case
    when v_total_count = 0 then 0
    else round((v_answered_count::numeric / v_total_count::numeric) * 100, 2)
  end;

  update public.discovery_sessions
  set status = 'in_progress',
      current_section_key = v_question.section_key,
      current_question_key = v_question.question_key,
      progress_percent = v_progress,
      last_activity_at = now()
  where id = v_session.id;

  return jsonb_build_object(
    'session_id', v_session.id,
    'question_key', v_question.question_key,
    'saved', true,
    'progress_percent', v_progress
  );
end;
$$;

create or replace function public.complete_discovery_session(
  p_session_id uuid,
  p_resume_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session public.discovery_sessions%rowtype;
  v_project public.discovery_projects%rowtype;
  v_missing_required text[];
begin
  select * into v_session
  from public.discovery_sessions
  where id = p_session_id
    and resume_token_hash = public.discovery_token_hash(p_resume_token)
  for update;

  if v_session.id is null then
    raise exception 'invalid_discovery_session';
  end if;

  if v_session.status = 'completed' then
    return jsonb_build_object(
      'session_id', v_session.id,
      'status', 'completed',
      'completed_at', v_session.completed_at,
      'already_completed', true
    );
  end if;

  select * into v_project
  from public.discovery_projects
  where id = v_session.project_id;

  select array_agg(q.question_key order by q.position)
  into v_missing_required
  from public.discovery_questions q
  left join public.discovery_answers a
    on a.question_id = q.id
   and a.session_id = v_session.id
  where q.template_key = v_project.template_key
    and q.template_version = v_project.template_version
    and q.required = true
    and a.id is null;

  if coalesce(array_length(v_missing_required, 1), 0) > 0 then
    raise exception 'required_questions_missing:%', array_to_string(v_missing_required, ',');
  end if;

  update public.discovery_sessions
  set status = 'completed',
      progress_percent = 100,
      completed_at = now(),
      last_activity_at = now()
  where id = v_session.id
  returning * into v_session;

  return jsonb_build_object(
    'session_id', v_session.id,
    'status', v_session.status,
    'completed_at', v_session.completed_at,
    'progress_percent', v_session.progress_percent
  );
end;
$$;

revoke all on function public.discovery_token_hash(text) from public, anon, authenticated;
revoke all on function public.get_discovery_template(text) from public;
revoke all on function public.start_discovery_session(text, text, text) from public;
revoke all on function public.get_discovery_session(uuid, text) from public;
revoke all on function public.save_discovery_answer(uuid, text, text, jsonb) from public;
revoke all on function public.complete_discovery_session(uuid, text) from public;

grant execute on function public.get_discovery_template(text) to anon, authenticated;
grant execute on function public.start_discovery_session(text, text, text) to anon, authenticated;
grant execute on function public.get_discovery_session(uuid, text) to anon, authenticated;
grant execute on function public.save_discovery_answer(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.complete_discovery_session(uuid, text) to anon, authenticated;

comment on function public.get_discovery_template(text) is 'Public read surface for a versioned discovery template. Direct table reads remain blocked by RLS.';
comment on function public.start_discovery_session(text, text, text) is 'Creates a discovery session and returns the plaintext resume token exactly once; only its SHA-256 hash is stored.';
comment on function public.get_discovery_session(uuid, text) is 'Resumes a discovery session using session ID + secret resume token.';
comment on function public.save_discovery_answer(uuid, text, text, jsonb) is 'Upserts an answer after validating session token and template ownership; direct answer writes remain blocked.';
comment on function public.complete_discovery_session(uuid, text) is 'Completes a session after checking required questions. Conditional-required semantics will be enforced when template conditions are finalized.';