-- =====================================================================
-- Fecha o achado "RLS Enabled No Policy" nas 3 tabelas apontadas pelo
-- advisor de segurança: config_integracao, imersao_orders, planilha_fila.
-- Nenhuma delas deveria ser lida por anon/authenticated direto — quem
-- escreve é sempre Edge Function com service_role (que ignora RLS).
-- Aqui só se dá LEITURA a quem já é admin (eh_admin()), e se fecha a
-- porta de grants largos que sobraram em imersao_orders.
-- =====================================================================

-- imersao_orders tinha GRANT total (select/insert/update/delete/...)
-- para anon e authenticated. Hoje isso não vaza nada porque RLS sem
-- política nega tudo por padrão — mas é superfície de ataque à toa:
-- se algum dia uma política solta demais for criada, esse grant já
-- deixa o caminho aberto. Fecha agora.
revoke all on public.imersao_orders from anon, authenticated;

drop policy if exists imersao_orders_admin_le on public.imersao_orders;
create policy imersao_orders_admin_le on public.imersao_orders
  for select to authenticated using (public.eh_admin());

drop policy if exists config_integracao_admin_le on public.config_integracao;
create policy config_integracao_admin_le on public.config_integracao
  for select to authenticated using (public.eh_admin());

drop policy if exists planilha_fila_admin_le on public.planilha_fila;
create policy planilha_fila_admin_le on public.planilha_fila
  for select to authenticated using (public.eh_admin());
