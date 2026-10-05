-- =====================================================================
-- Consolidação de `players` duplicados por e-mail.
--
-- NÃO É UMA MIGRAÇÃO — NÃO RODAR VIA apply_migration, NÃO RODAR SOZINHO.
-- É dado sensível (nome, data de nascimento, identidade). Leia o passo 1
-- (relatório), confira linha por linha, e só então decida rodar o passo 3.
--
-- Causa raiz (corrigida em supabase/functions/ingestao e imersao-signup,
-- nesta mesma leva): o player_id nasce no localStorage do navegador e
-- nunca mudava de volta — se a pessoa passasse pelo funil mais de uma vez
-- (trocou de aparelho, limpou o navegador, corrigiu um erro de digitação),
-- cada passagem criava uma linha nova em `players` com o mesmo e-mail.
-- Este script consolida o que esse bug já criou até aqui.
-- =====================================================================

-- ---------------------------------------------------------------------
-- PASSO 1 — RELATÓRIO (seguro, só leitura). Rode isto primeiro e leia.
-- ---------------------------------------------------------------------
with grupos as (
  select lower(email) as email_norm, count(*) as linhas,
         count(distinct user_id) filter (where user_id is not null) as logins_distintos
  from public.players
  where email is not null
  group by lower(email)
  having count(*) > 1
)
select g.email_norm, g.linhas, g.logins_distintos,
       p.player_id, p.nome, p.data_nascimento, p.user_id,
       (p.autorretrato_json ? 'mapa') as tem_mapa_rico,
       (p.autorretrato_json is not null) as tem_autorretrato,
       p.created_at, p.autorretrato_em,
       case when g.logins_distintos > 1
         then '⚠ MAIS DE UM LOGIN REAL NESTE GRUPO — NÃO AUTOMATIZAR, revisar à mão'
         else null
       end as aviso
from grupos g
join public.players p on lower(p.email) = g.email_norm
order by g.email_norm, p.created_at;

-- ---------------------------------------------------------------------
-- PASSO 2 — a função de consolidação. Só cria a função; não faz nada
-- sozinha. Critério do canônico por grupo, igual ao usado em ingestao e
-- imersao-signup: já ligado a um login (user_id) > tem Autorretrato rico
-- do rpgojc (chave "mapa") > qualquer Autorretrato > o mais antigo.
-- Grupos com mais de um user_id distinto são pulados (ver aviso no
-- relatório) — mesclar dois logins reais exige decisão humana, nunca
-- automática.
-- ---------------------------------------------------------------------
create or replace function public.consolidar_players_duplicados(p_dry_run boolean default true)
returns table(email_norm text, canonico uuid, absorvido uuid, acao text)
language plpgsql
as $function$
declare
  grupo record;
  dup record;
  canonico_id uuid;
begin
  for grupo in
    select lower(email) as email_norm
    from public.players
    where email is not null
    group by lower(email)
    having count(*) > 1
       and count(distinct user_id) filter (where user_id is not null) <= 1
  loop
    select p.player_id into canonico_id
    from public.players p
    where lower(p.email) = grupo.email_norm
    order by
      (p.user_id is not null) desc,
      (p.autorretrato_json ? 'mapa') desc,
      (p.autorretrato_json is not null) desc,
      p.created_at asc
    limit 1;

    for dup in
      select p.player_id
      from public.players p
      where lower(p.email) = grupo.email_norm
        and p.player_id <> canonico_id
    loop
      email_norm := grupo.email_norm;
      canonico := canonico_id;
      absorvido := dup.player_id;

      if p_dry_run then
        acao := 'SIMULADO — nenhuma escrita feita (p_dry_run=true)';
      else
        update public.events set player_id = canonico_id where player_id = dup.player_id;

        -- imersao_jornada tem PK só em player_id: mover a linha do
        -- absorvido colidiria se o canônico já tiver uma. Apaga a do
        -- canônico antes (perde "onde ele está agora" nesse caso raro;
        -- ele recomeça do zero na Imersão, não perde respostas nem
        -- evidências, que estão em outras tabelas).
        delete from public.imersao_jornada where player_id = canonico_id
          and exists (select 1 from public.imersao_jornada where player_id = dup.player_id);
        update public.imersao_jornada set player_id = canonico_id where player_id = dup.player_id;

        update public.imersao_respostas set player_id = canonico_id where player_id = dup.player_id;

        -- imersao_missao_carimbos e imersao_desbloqueios_manuais têm chave
        -- composta (player_id, missao/etapa) — UPDATE não tem ON CONFLICT,
        -- então apaga do canônico a linha que colidiria antes de mover a
        -- do absorvido (perde o carimbo do canônico nesse caso específico,
        -- aceito: o carimbo é só "quando a missão foi vista a primeira
        -- vez", não é dado que valha a pena brigar por qual das duas
        -- cópias é a certa).
        delete from public.imersao_missao_carimbos c
        using public.imersao_missao_carimbos d
        where c.player_id = canonico_id and d.player_id = dup.player_id and c.missao = d.missao;
        update public.imersao_missao_carimbos set player_id = canonico_id where player_id = dup.player_id;

        delete from public.imersao_desbloqueios_manuais c
        using public.imersao_desbloqueios_manuais d
        where c.player_id = canonico_id and d.player_id = dup.player_id and c.etapa = d.etapa;
        update public.imersao_desbloqueios_manuais set player_id = canonico_id where player_id = dup.player_id;

        update public.imersao_evidencias set player_id = canonico_id where player_id = dup.player_id;
        update public.imersao_forja_diario_sessoes set player_id = canonico_id where player_id = dup.player_id;
        update public.admin_notes set player_id = canonico_id where player_id = dup.player_id;
        update public.admin_acoes set player_id = canonico_id where player_id = dup.player_id;

        -- preenche no canônico qualquer campo que esteja vazio nele mas
        -- preenchido na linha absorvida — nunca sobrescreve o que o
        -- canônico já tem, e nunca troca um autorretrato_json com "mapa"
        -- por um sem.
        update public.players c set
          nome = coalesce(c.nome, d.nome),
          whatsapp = coalesce(c.whatsapp, d.whatsapp),
          genero = coalesce(c.genero, d.genero),
          data_nascimento = coalesce(c.data_nascimento, d.data_nascimento),
          hora_nascimento = coalesce(c.hora_nascimento, d.hora_nascimento),
          cidade = coalesce(c.cidade, d.cidade),
          uf = coalesce(c.uf, d.uf),
          timezone = coalesce(c.timezone, d.timezone),
          reflection_selected = coalesce(c.reflection_selected, d.reflection_selected),
          autorretrato_json = case
            when (c.autorretrato_json ? 'mapa') then c.autorretrato_json
            else coalesce(d.autorretrato_json, c.autorretrato_json)
          end,
          autorretrato_em = coalesce(c.autorretrato_em, d.autorretrato_em)
        from public.players d
        where c.player_id = canonico_id and d.player_id = dup.player_id;

        delete from public.players where player_id = dup.player_id;
        acao := 'CONSOLIDADO';
      end if;

      return next;
    end loop;
  end loop;
end;
$function$;

-- ---------------------------------------------------------------------
-- PASSO 3 — depois de revisar o relatório do passo 1:
--
--   -- simulação, não escreve nada:
--   select * from public.consolidar_players_duplicados(true);
--
--   -- de verdade, dentro de uma transação, pra poder dar ROLLBACK se o
--   -- resultado não for o esperado:
--   begin;
--     select * from public.consolidar_players_duplicados(false);
--     -- confira o resultado, e só então:
--   commit;
--   -- (ou ROLLBACK; se algo parecer errado)
-- ---------------------------------------------------------------------
