-- Recuperação de progresso por e-mail + código de confirmação.
-- A pessoa pode começar o Autorretrato, parar, e voltar depois num
-- aparelho diferente (ou no mesmo, depois de limpar o navegador) sem
-- criar um jogador novo: digita o e-mail, recebe um código de 6 dígitos
-- (10 min de validade), confirma, e o jogo retoma de onde ela parou.
--
-- Por que exigir código em vez de só o e-mail: `players` guarda data de
-- nascimento e o Autorretrato — dado sensível. Sem confirmação, bastaria
-- saber o e-mail de alguém para ver o retrato dela.

create table public.recuperacao_codigos (
  email text primary key,
  codigo text not null,
  expira_em timestamptz not null,
  tentativas smallint not null default 0,
  criado_em timestamptz not null default now()
);

comment on table public.recuperacao_codigos is
  'Código de 6 dígitos para confirmar que quem está recuperando o progresso é dono do e-mail. Uma linha por e-mail; reenviar sobrescreve; usar apaga.';

alter table public.recuperacao_codigos enable row level security;
-- Sem política: só a service role (Edge Function recuperar-progresso) acessa.
-- RLS ligada sem política nega tudo por padrão para anon/authenticated.
