-- =====================================================================
-- GODMODE — o modo operador da Sala de Comando
-- =====================================================================
-- AINDA NÃO APLICADO EM PRODUÇÃO. Esta migração é a especificação executável.
--
-- POR QUE ELE EXISTE
-- O app vai falhar com pessoas reais. Alguém vai pagar por Pix direto, o
-- webhook vai atrasar, uma jogadora vai digitar o e-mail errado e jurar que
-- não recebeu a ficha. Sem GODMODE, a resposta para todos esses casos é
-- "não tem o que eu fazer" — e a pessoa vai embora.
--
-- A REGRA QUE GOVERNA TUDO AQUI
-- GODMODE mexe em ACESSO e ESTADO. Nunca em VERDADE CALCULADA.
-- Ele pode liberar a Imersão, destravar uma etapa, reenviar um e-mail,
-- corrigir um endereço. Ele NUNCA altera o Autorretrato, as posições
-- astronômicas ou as respostas do inventário. O motor é intocável —
-- inclusive para o dono do jogo.
--
-- E A SEGUNDA REGRA
-- Todo poder aqui deixa rastro. Em agosto este projeto perdeu um mês de
-- dados porque nada era registrado. Não se repete: nenhuma ação de GODMODE
-- acontece sem uma linha em admin_acoes dizendo quem fez, o quê e em quem.
-- =====================================================================

-- 1. Nem todo administrador é operador ------------------------------------
alter table public.admin_users
  add column if not exists godmode boolean not null default false;

comment on column public.admin_users.godmode is
  'true = pode operar o GODMODE. Ser admin dá leitura; godmode dá poder de escrita sobre o estado dos jogadores.';

create or replace function public.eh_godmode()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
      and a.godmode = true);
$$;
revoke all on function public.eh_godmode() from public, anon;
grant execute on function public.eh_godmode() to authenticated;

-- 2. O livro de bordo: nada acontece sem registro --------------------------
create table if not exists public.admin_acoes (
  id bigserial primary key,
  quando timestamptz not null default now(),
  quem text not null,                 -- e-mail do operador
  acao text not null,                 -- 'liberar_imersao', 'destravar_etapa', ...
  player_id uuid,                     -- em quem
  antes jsonb,                        -- como estava
  depois jsonb,                       -- como ficou
  motivo text                         -- por quê (obrigatório na interface)
);
create index if not exists admin_acoes_quando on public.admin_acoes (quando desc);
create index if not exists admin_acoes_player on public.admin_acoes (player_id, quando desc);

alter table public.admin_acoes enable row level security;
drop policy if exists acoes_admin_le on public.admin_acoes;
create policy acoes_admin_le on public.admin_acoes
  for select to authenticated using (public.eh_admin());
-- escrita só pelas funções abaixo (security definer). Ninguém insere na mão.

create or replace function public.registrar_acao(
  p_acao text, p_player uuid, p_antes jsonb, p_depois jsonb, p_motivo text)
returns void language sql security definer set search_path = public as $$
  insert into public.admin_acoes (quem, acao, player_id, antes, depois, motivo)
  values (coalesce(auth.jwt() ->> 'email','desconhecido'), p_acao, p_player,
          p_antes, p_depois, nullif(trim(coalesce(p_motivo,'')),''));
$$;
revoke all on function public.registrar_acao(text,uuid,jsonb,jsonb,text) from public, anon, authenticated;

-- 3. Onde mora o acesso à Imersão ------------------------------------------
create table if not exists public.acessos (
  player_id uuid primary key references public.players(player_id) on delete cascade,
  produto text not null default 'imersao',
  plano text,                          -- 'trimestral' | 'anual' | 'cortesia'
  liberado_em timestamptz not null default now(),
  expira_em timestamptz,
  origem text,                         -- 'cakto' | 'godmode' | 'piloto'
  observacao text
);
alter table public.acessos enable row level security;
drop policy if exists acessos_admin_le on public.acessos;
create policy acessos_admin_le on public.acessos for select to authenticated using (public.eh_admin());

-- 4. Os poderes -------------------------------------------------------------
-- Todos seguem o mesmo contrato: exigem godmode, exigem motivo, e registram.

-- 4.1 liberar a Imersão na mão (pagou por fora, cortesia, turma-piloto)
create or replace function public.god_liberar_imersao(
  p_id uuid, p_plano text, p_motivo text)
returns public.acessos language plpgsql security definer set search_path = public as $$
declare antes jsonb; novo public.acessos;
begin
  if not public.eh_godmode() then raise exception 'GODMODE não autorizado para este usuário'; end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'o motivo é obrigatório'; end if;
  if p_plano not in ('trimestral','anual','cortesia') then raise exception 'plano inválido'; end if;

  select to_jsonb(a) into antes from public.acessos a where a.player_id = p_id;

  insert into public.acessos (player_id, produto, plano, origem, observacao, expira_em)
  values (p_id, 'imersao', p_plano, 'godmode', p_motivo,
          case p_plano when 'trimestral' then now() + interval '3 months'
                       when 'anual'      then now() + interval '1 year'
                       else null end)
  on conflict (player_id) do update
     set plano = excluded.plano, origem = 'godmode', observacao = excluded.observacao,
         expira_em = excluded.expira_em, liberado_em = now()
  returning * into novo;

  perform public.registrar_acao('liberar_imersao', p_id, antes, to_jsonb(novo), p_motivo);
  return novo;
end; $$;
revoke all on function public.god_liberar_imersao(uuid,text,text) from public, anon;
grant execute on function public.god_liberar_imersao(uuid,text,text) to authenticated;

-- 4.2 corrigir o e-mail (erro de digitação é a causa nº1 de "não recebi")
create or replace function public.god_corrigir_email(p_id uuid, p_email text, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare antes jsonb;
begin
  if not public.eh_godmode() then raise exception 'GODMODE não autorizado para este usuário'; end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'o motivo é obrigatório'; end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'e-mail inválido'; end if;
  select jsonb_build_object('email', email) into antes from public.players where player_id = p_id;
  update public.players set email = lower(trim(p_email)), updated_at = now() where player_id = p_id;
  perform public.registrar_acao('corrigir_email', p_id, antes,
          jsonb_build_object('email', lower(trim(p_email))), p_motivo);
end; $$;
revoke all on function public.god_corrigir_email(uuid,text,text) from public, anon;
grant execute on function public.god_corrigir_email(uuid,text,text) to authenticated;

-- 4.3 destravar uma etapa (o app falhou e a pessoa ficou presa)
create or replace function public.god_destravar_etapa(p_id uuid, p_etapa smallint, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare antes jsonb;
begin
  if not public.eh_godmode() then raise exception 'GODMODE não autorizado para este usuário'; end if;
  if coalesce(trim(p_motivo),'') = '' then raise exception 'o motivo é obrigatório'; end if;
  if p_etapa < 0 or p_etapa > 7 then raise exception 'etapa fora do intervalo 0..7'; end if;
  select jsonb_build_object('current_stage', current_stage) into antes
    from public.players where player_id = p_id;
  update public.players set current_stage = p_etapa, updated_at = now() where player_id = p_id;
  perform public.registrar_acao('destravar_etapa', p_id, antes,
          jsonb_build_object('current_stage', p_etapa), p_motivo);
end; $$;
revoke all on function public.god_destravar_etapa(uuid,smallint,text) from public, anon;
grant execute on function public.god_destravar_etapa(uuid,smallint,text) to authenticated;

-- 4.4 reempurrar a pessoa para a planilha (a fila engasgou)
create or replace function public.god_reenfileirar(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_godmode() then raise exception 'GODMODE não autorizado para este usuário'; end if;
  insert into public.planilha_fila (carga) select to_jsonb(p) from public.players p where p.player_id = p_id;
  perform public.registrar_acao('reenfileirar', p_id, null, null, p_motivo);
end; $$;
revoke all on function public.god_reenfileirar(uuid,text) from public, anon;
grant execute on function public.god_reenfileirar(uuid,text) to authenticated;

-- 5. O que o GODMODE NÃO pode fazer ----------------------------------------
-- Não existe god_editar_autorretrato. Não existe god_mudar_respostas.
-- Não existe god_alterar_nascimento. Se você sentir vontade de criar uma
-- dessas, pare: o que a pessoa precisa é refazer o Autorretrato, não que
-- alguém mexa no retrato dela por trás. Um mapa editado à mão deixa de ser
-- um mapa e vira uma opinião com aparência de cálculo.

-- 6. Ligando o primeiro operador -------------------------------------------
-- update public.admin_users set godmode = true where email = 'seu@email.com';
