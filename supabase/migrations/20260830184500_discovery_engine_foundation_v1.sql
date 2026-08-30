create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.discovery_projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  template_key text not null,
  template_version integer not null default 1 check (template_version > 0),
  status text not null default 'draft' check (status in ('draft','active','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.discovery_questions (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  template_version integer not null default 1 check (template_version > 0),
  section_key text not null,
  question_key text not null,
  position integer not null check (position > 0),
  question_type text not null check (question_type in ('short_text','long_text','single_select','multi_select','boolean','number','date','url','email','upload')),
  prompt text not null,
  help_text text,
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb,
  conditions jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_key, template_version, question_key),
  unique (template_key, template_version, position)
);

create table public.discovery_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.discovery_projects(id) on delete cascade,
  respondent_name text,
  respondent_email text,
  status text not null default 'started' check (status in ('started','in_progress','completed','abandoned')),
  current_section_key text,
  current_question_key text,
  progress_percent numeric(5,2) not null default 0 check (progress_percent >= 0 and progress_percent <= 100),
  resume_token_hash text unique,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create table public.discovery_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  question_id uuid not null references public.discovery_questions(id) on delete restrict,
  value jsonb not null,
  answered_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table public.discovery_uploads (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  question_id uuid references public.discovery_questions(id) on delete set null,
  bucket text not null,
  object_path text not null,
  original_filename text,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  status text not null default 'pending' check (status in ('pending','ready','rejected','deleted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, object_path)
);

create table public.discovery_outputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.discovery_sessions(id) on delete cascade,
  output_type text not null,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft','generated','approved','superseded')),
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, output_type, version)
);

create index discovery_questions_template_idx on public.discovery_questions(template_key, template_version, section_key, position);
create index discovery_sessions_project_status_idx on public.discovery_sessions(project_id, status, last_activity_at desc);
create index discovery_answers_session_idx on public.discovery_answers(session_id);
create index discovery_uploads_session_idx on public.discovery_uploads(session_id);
create index discovery_outputs_session_idx on public.discovery_outputs(session_id, output_type);

create trigger discovery_projects_set_updated_at before update on public.discovery_projects for each row execute function public.set_updated_at();
create trigger discovery_questions_set_updated_at before update on public.discovery_questions for each row execute function public.set_updated_at();
create trigger discovery_sessions_set_updated_at before update on public.discovery_sessions for each row execute function public.set_updated_at();
create trigger discovery_answers_set_updated_at before update on public.discovery_answers for each row execute function public.set_updated_at();
create trigger discovery_uploads_set_updated_at before update on public.discovery_uploads for each row execute function public.set_updated_at();
create trigger discovery_outputs_set_updated_at before update on public.discovery_outputs for each row execute function public.set_updated_at();

alter table public.discovery_projects enable row level security;
alter table public.discovery_questions enable row level security;
alter table public.discovery_sessions enable row level security;
alter table public.discovery_answers enable row level security;
alter table public.discovery_uploads enable row level security;
alter table public.discovery_outputs enable row level security;

comment on table public.discovery_projects is 'Reusable discovery projects. Client-specific behavior is selected by template_key + template_version.';
comment on table public.discovery_questions is 'Versioned question definitions for the reusable Discovery Engine.';
comment on table public.discovery_sessions is 'One respondent run through a discovery project. Public resume credentials must be stored only as a hash.';
comment on table public.discovery_answers is 'Structured JSON answers for discovery questions.';
comment on table public.discovery_uploads is 'Metadata for files attached to discovery answers; object bytes live in Supabase Storage.';
comment on table public.discovery_outputs is 'Versioned strategic outputs derived from a completed discovery, such as the Website Blueprint.';

insert into public.discovery_projects (slug, name, template_key, template_version, status, metadata)
values (
  'germania-bandeira',
  'Dra. Germânia Bandeira',
  'germania-bandeira-v1',
  1,
  'draft',
  jsonb_build_object(
    'purpose', 'website_discovery_and_authority_architecture',
    'brand', 'YZIHUB',
    'launch_mode', 'minimum_authority_structure'
  )
);