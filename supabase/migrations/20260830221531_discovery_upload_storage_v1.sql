-- Mirrors the production migration `discovery_upload_storage_v1` already applied
-- to the germania-bandeira Supabase project. This file exists to eliminate
-- repo/production drift; do not reapply if the storage bucket already exists.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'germania-discovery-uploads',
  'germania-discovery-uploads',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

create or replace function public.can_upload_discovery_object(p_bucket text, p_object_path text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select exists (
    select 1
    from public.discovery_uploads u
    join public.discovery_sessions s on s.id = u.session_id
    where u.bucket = p_bucket
      and u.object_path = p_object_path
      and u.status = 'pending'
      and s.status in ('started', 'in_progress')
  );
$function$;

create or replace function public.reserve_discovery_upload(
  p_session_id uuid,
  p_resume_token text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint,
  p_question_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_session public.discovery_sessions%rowtype;
  v_question_id uuid;
  v_upload_id uuid := gen_random_uuid();
  v_object_path text;
  v_allowed_mime_types constant text[] := array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4',
    'video/quicktime'
  ];
begin
  if p_resume_token is null or length(p_resume_token) < 16 then
    raise exception 'invalid_resume_token';
  end if;

  select *
    into v_session
  from public.discovery_sessions
  where id = p_session_id
    and resume_token_hash = public.discovery_token_hash(p_resume_token);

  if not found then
    raise exception 'invalid_discovery_session';
  end if;

  if v_session.status = 'completed' then
    raise exception 'discovery_session_completed';
  end if;

  if p_original_filename is null or btrim(p_original_filename) = '' then
    raise exception 'filename_required';
  end if;

  if p_mime_type is null or not (p_mime_type = any(v_allowed_mime_types)) then
    raise exception 'unsupported_file_type';
  end if;

  if p_size_bytes is null or p_size_bytes <= 0 or p_size_bytes > 52428800 then
    raise exception 'invalid_file_size';
  end if;

  if p_question_key is not null then
    select q.id
      into v_question_id
    from public.discovery_questions q
    join public.discovery_projects p
      on p.template_key = q.template_key
     and p.template_version = q.template_version
    where p.id = v_session.project_id
      and q.question_key = p_question_key
    limit 1;

    if v_question_id is null then
      raise exception 'invalid_question_key';
    end if;
  end if;

  v_object_path := p_session_id::text || '/' || v_upload_id::text;

  insert into public.discovery_uploads (
    id,
    session_id,
    question_id,
    bucket,
    object_path,
    original_filename,
    mime_type,
    size_bytes,
    status,
    metadata
  ) values (
    v_upload_id,
    p_session_id,
    v_question_id,
    'germania-discovery-uploads',
    v_object_path,
    p_original_filename,
    p_mime_type,
    p_size_bytes,
    'pending',
    jsonb_build_object('reserved_at', now())
  );

  update public.discovery_sessions
  set last_activity_at = now(), updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'upload_id', v_upload_id,
    'bucket', 'germania-discovery-uploads',
    'object_path', v_object_path,
    'max_size_bytes', 52428800
  );
end;
$function$;

create or replace function public.finalize_discovery_upload(
  p_session_id uuid,
  p_resume_token text,
  p_upload_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'storage'
as $function$
declare
  v_session public.discovery_sessions%rowtype;
  v_upload public.discovery_uploads%rowtype;
  v_object record;
begin
  if p_resume_token is null or length(p_resume_token) < 16 then
    raise exception 'invalid_resume_token';
  end if;

  select *
    into v_session
  from public.discovery_sessions
  where id = p_session_id
    and resume_token_hash = public.discovery_token_hash(p_resume_token);

  if not found then
    raise exception 'invalid_discovery_session';
  end if;

  select *
    into v_upload
  from public.discovery_uploads
  where id = p_upload_id
    and session_id = p_session_id
    and bucket = 'germania-discovery-uploads';

  if not found then
    raise exception 'upload_not_found';
  end if;

  select o.id, o.metadata
    into v_object
  from storage.objects o
  where o.bucket_id = v_upload.bucket
    and o.name = v_upload.object_path
  limit 1;

  if v_object.id is null then
    raise exception 'storage_object_not_found';
  end if;

  update public.discovery_uploads
  set status = 'ready',
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'finalized_at', now(),
        'storage_object_id', v_object.id,
        'storage_metadata', coalesce(v_object.metadata, '{}'::jsonb)
      ),
      updated_at = now()
  where id = p_upload_id;

  update public.discovery_sessions
  set last_activity_at = now(), updated_at = now()
  where id = p_session_id;

  return jsonb_build_object(
    'upload_id', p_upload_id,
    'status', 'ready',
    'bucket', v_upload.bucket,
    'object_path', v_upload.object_path,
    'original_filename', v_upload.original_filename
  );
end;
$function$;

create policy discovery_reserved_upload_insert
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'germania-discovery-uploads'
  and public.can_upload_discovery_object(bucket_id, name)
);

revoke all on function public.can_upload_discovery_object(text, text) from public;
revoke all on function public.reserve_discovery_upload(uuid, text, text, text, bigint, text) from public;
revoke all on function public.finalize_discovery_upload(uuid, text, uuid) from public;

grant execute on function public.can_upload_discovery_object(text, text) to anon, authenticated;
grant execute on function public.reserve_discovery_upload(uuid, text, text, text, bigint, text) to anon, authenticated;
grant execute on function public.finalize_discovery_upload(uuid, text, uuid) to anon, authenticated;

comment on function public.reserve_discovery_upload(uuid, text, text, text, bigint, text) is 'Validates type/size and reserves a Storage object path for a discovery upload; the client uploads to this exact path.';
comment on function public.finalize_discovery_upload(uuid, text, uuid) is 'Marks a discovery upload ready after the Storage object has been confirmed to exist.';
comment on function public.can_upload_discovery_object(text, text) is 'Storage RLS helper: only allows INSERT into an object path that was previously reserved and still pending for an active session.';
