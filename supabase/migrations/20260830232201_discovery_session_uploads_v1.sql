-- Minimal, additive change so a resumed session can see uploads it already
-- has in Storage without re-uploading. Only the accessor RPC changes;
-- start_discovery_session, save_discovery_answer and complete_discovery_session
-- are untouched.

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
  v_uploads jsonb;
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

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'upload_id', u.id,
      'question_key', q.question_key,
      'status', u.status,
      'original_filename', u.original_filename,
      'mime_type', u.mime_type,
      'size_bytes', u.size_bytes
    ) order by u.created_at
  ), '[]'::jsonb)
  into v_uploads
  from public.discovery_uploads u
  left join public.discovery_questions q on q.id = u.question_id
  where u.session_id = v_session.id
    and u.status = 'ready';

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
    'answers', v_answers,
    'uploads', v_uploads
  );
end;
$$;

comment on function public.get_discovery_session(uuid, text) is 'Resumes a discovery session using session ID + secret resume token. Also returns ready uploads so a resumed session does not need to re-upload files.';
