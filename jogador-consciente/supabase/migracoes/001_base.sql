-- =====================================================================
-- RPG — O JOGADOR CONSCIENTE · esquema base
-- Jogadores, eventos, administradores e notas.
-- RECONSTRUÇÃO a partir do que foi aplicado em produção entre 30/08 e
-- 15/09/2026. Confira contra o banco vivo antes de aplicar em outro lugar:
--   select table_name, column_name from information_schema.columns
--    where table_schema='public' order by 1,ordinal_position;
-- =====================================================================

create table if not exists public.players (
  player_id uuid primary key,
  nome text, email text, whatsapp text, genero text,
  data_nascimento date, hora_nascimento time, hora_incerta boolean,
  cidade text, uf char(2), timezone text,
  current_stage smallint,
  reflection_selected text,
  autorretrato_em timestamptz,
  source text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  first_touch jsonb, last_touch jsonb, consentimentos jsonb,
  app_versao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  event_id uuid primary key,
  player_id uuid references public.players(player_id) on delete cascade,
  event_name text not null,
  ocorrido_em timestamptz not null default now(),
  session_id text, screen text, utm jsonb, metadata jsonb,
  recebido_em timestamptz not null default now()
);
create index if not exists events_player_idx on public.events (player_id, ocorrido_em desc);
create index if not exists events_nome_idx   on public.events (event_name);

-- administradores: a chave é o E-MAIL, nunca um uuid para copiar na mão
create table if not exists public.admin_users (
  email text primary key,
  nome text,
  criado_em timestamptz not null default now()
);

create table if not exists public.admin_notes (
  id bigserial primary key,
  player_id uuid references public.players(player_id) on delete cascade,
  autor text, nota text not null,
  criado_em timestamptz not null default now()
);

-- quem é administrador (usada dentro das políticas de RLS)
create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;

alter table public.players     enable row level security;
alter table public.events      enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_notes enable row level security;

drop policy if exists players_admin_le on public.players;
create policy players_admin_le on public.players for select to authenticated using (public.eh_admin());
drop policy if exists events_admin_le on public.events;
create policy events_admin_le  on public.events  for select to authenticated using (public.eh_admin());
drop policy if exists admin_users_le on public.admin_users;
create policy admin_users_le   on public.admin_users for select to authenticated using (public.eh_admin());
drop policy if exists notas_admin_tudo on public.admin_notes;
create policy notas_admin_tudo on public.admin_notes for all to authenticated using (public.eh_admin());

-- LGPD: apagar uma pessoa e tudo que é dela
create or replace function public.apagar_jogador(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'apenas administradores'; end if;
  delete from public.admin_notes where player_id = p_id;
  delete from public.events      where player_id = p_id;
  delete from public.players     where player_id = p_id;
end;
$$;
revoke all on function public.apagar_jogador(uuid) from public, anon;
grant execute on function public.apagar_jogador(uuid) to authenticated;
