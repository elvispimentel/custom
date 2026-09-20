-- =====================================================================
-- O PAINEL — funil com recorte de período e a visão de CRM.
-- Cada etapa conta JOGADORES DISTINTOS, nunca visitas.
-- =====================================================================

create or replace function public.painel_funil(desde timestamptz default null, ate timestamptz default null)
returns table (ordem int, etapa text, jogadores bigint, futura boolean)
language sql stable security invoker set search_path = public as $$
with j as (
  select p.player_id from public.players p
  where (desde is null or p.created_at >= desde)
    and (ate   is null or p.created_at <  ate)
),
e as (select ev.player_id, ev.event_name from public.events ev join j on j.player_id = ev.player_id),
c as (
  select
    (select count(*) from j) as entrou,
    count(distinct player_id) filter (where event_name in ('identity_started','name_completed','gender_selected')) as identificacao,
    count(distinct player_id) filter (where event_name = 'birth_data_completed') as nascimento,
    count(distinct player_id) filter (where event_name = 'self_assessment_started') as comecou,
    count(distinct player_id) filter (where event_name = 'self_assessment_completed') as concluiu,
    count(distinct player_id) filter (where event_name in ('portrait_generated','portrait_viewed')) as mapa,
    -- ATENÇÃO: 'instruction_mode_started' NÃO entra aqui. Esse evento dispara
    -- em todo Modo de Instrução, inclusive na abertura do app — contá-lo fazia
    -- a etapa 7 ter mais gente do que a etapa 6, o que é impossível.
    count(distinct player_id) filter (where event_name = 'initial_instructions_viewed') as chegou,
    count(distinct player_id) filter (where event_name in ('initial_instructions_clicked','initial_instructions_started')) as iniciou,
    count(distinct player_id) filter (where event_name = 'initial_instructions_completed') as terminou,
    count(distinct player_id) filter (where event_name = 'immersion_offer_viewed') as viu_oferta,
    count(distinct player_id) filter (where event_name = 'checkout_clicked') as checkout,
    count(distinct player_id) filter (where event_name = 'immersion_purchased') as comprou
  from e
)
select * from (values
  (1,  'Entrou no jogo',                  (select entrou from c),        false),
  (2,  'Começou a identificação',         (select identificacao from c), false),
  (3,  'Deu a data de nascimento',        (select nascimento from c),    false),
  (4,  'Começou o autorretrato',          (select comecou from c),       false),
  (5,  'Concluiu o autorretrato',         (select concluiu from c),      false),
  (6,  'Recebeu o mapa',                  (select mapa from c),          false),
  (7,  'Chegou às Instruções Iniciais',   (select chegou from c),        false),
  (8,  'Iniciou as Instruções Iniciais',  (select iniciou from c),       false),
  (9,  'Concluiu as Instruções Iniciais', (select terminou from c),      true),
  (10, 'Viu a oferta da Imersão',         (select viu_oferta from c),    true),
  (11, 'Foi para o checkout',             (select checkout from c),      true),
  (12, 'Comprou a Imersão',               (select comprou from c),       true)
) as t(ordem, etapa, jogadores, futura)
order by ordem;
$$;
revoke all on function public.painel_funil(timestamptz,timestamptz) from public, anon;
grant execute on function public.painel_funil(timestamptz,timestamptz) to authenticated;

create or replace view public.v_jogadores with (security_invoker = true) as
select
  p.player_id, p.nome, p.email, p.whatsapp, p.genero,
  p.data_nascimento, p.hora_nascimento, p.hora_incerta,
  p.cidade, p.uf, p.timezone,
  p.current_stage, p.created_at, p.updated_at, p.app_versao,
  coalesce(nullif(p.utm_source,''), p.source, 'direto') as origem,
  p.utm_source, p.utm_medium, p.utm_campaign, p.utm_content, p.utm_term,
  p.first_touch, p.last_touch, p.consentimentos,
  (p.autorretrato_em is not null) as concluiu_autorretrato,
  p.autorretrato_em,
  p.reflection_selected as reflexao,
  exists (select 1 from public.events e where e.player_id = p.player_id
          and e.event_name = 'initial_instructions_viewed') as instrucoes_acessadas,
  exists (select 1 from public.events e where e.player_id = p.player_id
          and e.event_name in ('initial_instructions_clicked','initial_instructions_started')) as instrucoes_iniciadas,
  exists (select 1 from public.events e where e.player_id = p.player_id
          and e.event_name = 'portrait_downloaded') as baixou_ficha,
  (select max(e.ocorrido_em) from public.events e where e.player_id = p.player_id) as ultima_atividade,
  (select count(*) from public.events e where e.player_id = p.player_id) as eventos,
  (select count(*) from public.admin_notes n where n.player_id = p.player_id) as notas
from public.players p;
grant select on public.v_jogadores to authenticated;
revoke all on public.v_jogadores from anon;
