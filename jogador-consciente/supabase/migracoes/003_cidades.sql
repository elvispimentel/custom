-- =====================================================================
-- AS CIDADES DO MUNDO — 170.911 cidades, 246 países (GeoNames cities1000).
-- O Brasil continua embutido no app (5.570 municípios, offline).
-- Isto aqui é o resto do mundo, que não caberia num HTML.
-- A carga é feita pela Edge Function "importar-cidades" (ver docs/).
-- =====================================================================
create extension if not exists pg_trgm  with schema extensions;
create extension if not exists unaccent with schema extensions;

create table if not exists public.cidades (
  id bigint primary key,
  nome text not null,
  nome_busca text not null,     -- sem acento, minúsculo
  alt_busca text,               -- apelidos em outras línguas (|toquio|tokio|)
  pais char(2) not null,
  admin1 text,
  lat double precision not null,
  lon double precision not null,
  tz text not null,             -- fuso IANA próprio de cada cidade
  pop integer not null default 0
);
create index if not exists cidades_busca_trgm on public.cidades using gin (nome_busca extensions.gin_trgm_ops);
create index if not exists cidades_pais_idx on public.cidades (pais);
create index if not exists cidades_pop_idx  on public.cidades (pop desc);

alter table public.cidades enable row level security;
drop policy if exists cidades_leitura_publica on public.cidades;
create policy cidades_leitura_publica on public.cidades for select to anon, authenticated using (true);

create or replace function public.buscar_cidade(termo text, limite int default 12)
returns table (nome text, pais char(2), admin1 text, lat double precision, lon double precision, tz text, pop integer)
language sql stable security invoker set search_path = public, extensions as $$
  with q as (select lower(extensions.unaccent(coalesce(termo,''))) as t)
  select c.nome, c.pais, c.admin1, c.lat, c.lon, c.tz, c.pop
  from public.cidades c, q
  where length(q.t) >= 2
    and (c.nome_busca like q.t || '%' or c.alt_busca like '%|' || q.t || '%')
  order by
    (case when c.nome_busca = q.t then 0
          when c.alt_busca like '%|' || q.t || '|%' then 0
          when c.nome_busca like q.t || '%' then 1
          else 2 end),
    c.pop desc
  limit greatest(1, least(coalesce(limite,12), 30));
$$;
revoke all on function public.buscar_cidade(text,int) from public;
grant execute on function public.buscar_cidade(text,int) to anon, authenticated;
