-- Tutor de idiomas: esquema inicial.
-- Todas as tabelas têm RLS ligado e nenhuma política: só a service role (servidor) acessa.

create table if not exists tutor_settings (
  id int primary key default 1 check (id = 1),
  timezone text not null default 'America/Sao_Paulo',
  paused boolean not null default false,
  session_minutes int not null default 15 check (session_minutes between 5 and 60),
  reminders jsonb not null default '[
    {"slot":"manha","hour":8,"language":"es","enabled":true},
    {"slot":"tarde","hour":14,"language":"en","enabled":true},
    {"slot":"noite","hour":20,"language":"es","enabled":true}
  ]'::jsonb,
  country text not null default 'AR' check (country in ('AR','BO','PY','UY')),
  updated_at timestamptz not null default now()
);
insert into tutor_settings (id) values (1) on conflict do nothing;

create table if not exists tutor_profiles (
  language text primary key check (language in ('en','es')),
  level_estimate text,
  notes text,
  difficulties jsonb not null default '[]'::jsonb,
  vocabulary jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
insert into tutor_profiles (language) values ('en'), ('es') on conflict do nothing;

create table if not exists tutor_sessions (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('en','es')),
  country text check (country in ('AR','BO','PY','UY')),
  status text not null default 'open' check (status in ('open','closed')),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  ended_at timestamptz,
  active_seconds int not null default 0,
  summary jsonb
);
create index if not exists tutor_sessions_started_idx on tutor_sessions (started_at desc);
create index if not exists tutor_sessions_open_idx on tutor_sessions (status) where status = 'open';

create table if not exists tutor_messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references tutor_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists tutor_messages_session_idx on tutor_messages (session_id, id);

create table if not exists tutor_push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

-- Uma linha por lembrete enviado: a chave primária impede envio duplicado.
create table if not exists tutor_reminder_log (
  slot text not null,
  local_date date not null,
  sent_at timestamptz not null default now(),
  primary key (slot, local_date)
);

create table if not exists tutor_usage (
  day date primary key,
  stt_seconds numeric not null default 0,
  tts_chars int not null default 0,
  llm_calls int not null default 0
);

create table if not exists tutor_kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Soma o uso do dia de forma atômica e devolve o total atualizado.
create or replace function tutor_bump_usage(p_day date, p_stt numeric, p_tts int, p_llm int)
returns tutor_usage
language sql
security invoker
set search_path = public
as $$
  insert into tutor_usage as u (day, stt_seconds, tts_chars, llm_calls)
  values (p_day, p_stt, p_tts, p_llm)
  on conflict (day) do update
    set stt_seconds = u.stt_seconds + excluded.stt_seconds,
        tts_chars = u.tts_chars + excluded.tts_chars,
        llm_calls = u.llm_calls + excluded.llm_calls
  returning u.*;
$$;

-- Soma segundos praticados sem corrida entre abas.
create or replace function tutor_add_active_seconds(p_session uuid, p_seconds int)
returns void
language sql
security invoker
set search_path = public
as $$
  update tutor_sessions
     set active_seconds = active_seconds + greatest(0, least(p_seconds, 120)),
         last_activity_at = now()
   where id = p_session and status = 'open';
$$;

alter table tutor_settings enable row level security;
alter table tutor_profiles enable row level security;
alter table tutor_sessions enable row level security;
alter table tutor_messages enable row level security;
alter table tutor_push_subscriptions enable row level security;
alter table tutor_reminder_log enable row level security;
alter table tutor_usage enable row level security;
alter table tutor_kv enable row level security;

revoke all on function tutor_bump_usage(date, numeric, int, int) from public, anon, authenticated;
revoke all on function tutor_add_active_seconds(uuid, int) from public, anon, authenticated;
grant execute on function tutor_bump_usage(date, numeric, int, int) to service_role;
grant execute on function tutor_add_active_seconds(uuid, int) to service_role;
