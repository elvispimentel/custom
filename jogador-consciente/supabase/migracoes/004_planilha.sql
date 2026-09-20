-- =====================================================================
-- A PONTE PARA A PLANILHA DO GOOGLE
-- players -> gatilho -> fila -> (pg_cron, 1 min) -> função "planilha"
--   -> Apps Script -> planilha.
-- Um jogador = uma linha, atualizada no lugar. Espelho, não empilhamento.
-- =====================================================================
create extension if not exists pg_net  with schema extensions;
create extension if not exists pg_cron with schema extensions;

create table if not exists public.config_integracao (
  chave text primary key, valor text, atualizado_em timestamptz not null default now()
);
alter table public.config_integracao enable row level security;
revoke all on public.config_integracao from anon, authenticated;
insert into public.config_integracao (chave, valor) values ('planilha_url', null)
  on conflict (chave) do nothing;

create table if not exists public.planilha_fila (
  id bigserial primary key,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz, tentativas int not null default 0, erro text,
  carga jsonb not null
);
create index if not exists planilha_fila_pendentes on public.planilha_fila (id) where enviado_em is null;
alter table public.planilha_fila enable row level security;
revoke all on public.planilha_fila from anon, authenticated;

create or replace function public.enfileirar_jogador()
returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.planilha_fila (carga) values (to_jsonb(new)); return new; end; $$;
revoke all on function public.enfileirar_jogador() from public, anon, authenticated;

drop trigger if exists tg_planilha_jogador on public.players;
create trigger tg_planilha_jogador after insert or update on public.players
  for each row execute function public.enfileirar_jogador();

create or replace function public.planilha_falhou(p_id bigint, p_erro text)
returns void language sql security definer set search_path = public as $$
  update public.planilha_fila set tentativas = tentativas + 1, erro = left(coalesce(p_erro,''),300)
   where id = p_id;
$$;
revoke all on function public.planilha_falhou(bigint,text) from public, anon, authenticated;

create or replace function public.escoar_planilha()
returns bigint language plpgsql security definer set search_path = public, extensions as $$
declare req bigint;
begin
  if not exists (select 1 from public.config_integracao
                 where chave='planilha_url' and coalesce(valor,'') <> '') then return 0; end if;
  select net.http_post(
    url := 'https://SEU-PROJETO.supabase.co/functions/v1/planilha',
    body := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 55000) into req;
  return req;
end; $$;
revoke all on function public.escoar_planilha() from public, anon, authenticated;

-- select cron.schedule('escoar-planilha', '* * * * *', $$select public.escoar_planilha();$$);
