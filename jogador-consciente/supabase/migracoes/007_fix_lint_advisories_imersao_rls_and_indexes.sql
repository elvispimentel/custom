-- Corrige os avisos do linter do Supabase nas tabelas imersao_* (RLS re-avaliando
-- auth.uid() por linha, políticas duplicadas no SELECT, e FKs sem índice).
-- Nenhuma mudança de permissão efetiva: mesmo comportamento, mais rápido em escala.

-- 1) índices em FKs sem cobertura
create index if not exists admin_notes_player_id_idx on public.admin_notes (player_id);
create index if not exists imersao_evidencias_player_id_idx on public.imersao_evidencias (player_id);
create index if not exists imersao_orders_user_id_idx on public.imersao_orders (user_id);

-- 2) imersao_compass_consents — só envolver auth.uid() em subselect
drop policy if exists "consentimento proprio" on public.imersao_compass_consents;
create policy "consentimento proprio" on public.imersao_compass_consents
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 3) imersao_daily_compass_cards — idem, sem sobreposição (já eram comandos distintos)
drop policy if exists "card proprio - ler" on public.imersao_daily_compass_cards;
create policy "card proprio - ler" on public.imersao_daily_compass_cards
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "card proprio - marcar lido" on public.imersao_daily_compass_cards;
create policy "card proprio - marcar lido" on public.imersao_daily_compass_cards
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- 4) imersao_forja_diario_sessoes — idem, sem sobreposição
drop policy if exists "jogador vê suas próprias sessões da forja" on public.imersao_forja_diario_sessoes;
create policy "jogador vê suas próprias sessões da forja" on public.imersao_forja_diario_sessoes
  for select
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));

drop policy if exists "jogador grava suas próprias sessões da forja" on public.imersao_forja_diario_sessoes;
create policy "jogador grava suas próprias sessões da forja" on public.imersao_forja_diario_sessoes
  for insert
  with check (player_id in (select player_id from public.players where user_id = (select auth.uid())));

drop policy if exists "jogador atualiza suas próprias sessões da forja" on public.imersao_forja_diario_sessoes;
create policy "jogador atualiza suas próprias sessões da forja" on public.imersao_forja_diario_sessoes
  for update
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));

-- 5) as 4 tabelas com política ALL sobrepondo a política de SELECT dedicada:
-- imersao_jornada, imersao_respostas, imersao_missao_carimbos, imersao_evidencias.
-- Troca a política ALL por INSERT+UPDATE+DELETE separadas (mesmo efeito, sem
-- sobrepor a política de SELECT), e envolve auth.uid() em subselect nas duas.

drop policy if exists "jogador vê sua própria jornada" on public.imersao_jornada;
create policy "jogador vê sua própria jornada" on public.imersao_jornada
  for select
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
drop policy if exists "jogador atualiza sua própria jornada" on public.imersao_jornada;
create policy "jogador insere sua própria jornada" on public.imersao_jornada
  for insert
  with check (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador atualiza sua própria jornada" on public.imersao_jornada
  for update
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador apaga sua própria jornada" on public.imersao_jornada
  for delete
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));

drop policy if exists "jogador vê suas próprias respostas" on public.imersao_respostas;
create policy "jogador vê suas próprias respostas" on public.imersao_respostas
  for select
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
drop policy if exists "jogador grava suas próprias respostas" on public.imersao_respostas;
create policy "jogador insere suas próprias respostas" on public.imersao_respostas
  for insert
  with check (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador atualiza suas próprias respostas" on public.imersao_respostas
  for update
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador apaga suas próprias respostas" on public.imersao_respostas
  for delete
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));

drop policy if exists "jogador vê seus próprios carimbos" on public.imersao_missao_carimbos;
create policy "jogador vê seus próprios carimbos" on public.imersao_missao_carimbos
  for select
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
drop policy if exists "jogador grava seus próprios carimbos" on public.imersao_missao_carimbos;
create policy "jogador insere seus próprios carimbos" on public.imersao_missao_carimbos
  for insert
  with check (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador atualiza seus próprios carimbos" on public.imersao_missao_carimbos
  for update
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador apaga seus próprios carimbos" on public.imersao_missao_carimbos
  for delete
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));

drop policy if exists "jogador vê suas próprias evidências" on public.imersao_evidencias;
create policy "jogador vê suas próprias evidências" on public.imersao_evidencias
  for select
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
drop policy if exists "jogador grava suas próprias evidências" on public.imersao_evidencias;
create policy "jogador insere suas próprias evidências" on public.imersao_evidencias
  for insert
  with check (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador atualiza suas próprias evidências" on public.imersao_evidencias
  for update
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
create policy "jogador apaga suas próprias evidências" on public.imersao_evidencias
  for delete
  using (player_id in (select player_id from public.players where user_id = (select auth.uid())));
