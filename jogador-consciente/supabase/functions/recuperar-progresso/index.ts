// RPG — O Jogador Consciente · recuperação de progresso por e-mail
// A pessoa pode começar o Autorretrato, parar, e voltar depois num
// aparelho diferente sem criar um jogador novo (ver ingestao, que já
// reconcilia por e-mail no upsert). Isto cobre o outro lado: trazer de
// volta, PARA O APARELHO NOVO, os dados que já existiam no antigo.
//
// Exige código de 6 dígitos (não só o e-mail) porque `players` guarda
// data de nascimento e o Autorretrato — dado sensível. Sem confirmação,
// bastaria saber o e-mail de alguém para ver o retrato dela.
//
// Duas ações no mesmo endpoint:
//   { acao: 'enviar',    email }          -> manda o código por e-mail
//   { acao: 'confirmar', email, codigo }  -> valida e devolve o jogador
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const VALIDADE_MIN = 10;
const THROTTLE_SEGUNDOS = 45; // não reenvia código se pediu há menos tempo que isso
const TENTATIVAS_MAX = 5;
const REMETENTE = Deno.env.get('REMETENTE_FICHA') ?? 'O Jogador Consciente <onboarding@resend.dev>';

function resp(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function codigoAleatorio(): string {
  // 6 dígitos, com zero à esquerda se precisar — nunca usa Math.random para isto.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(buf[0] % 1_000_000).padStart(6, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ erro: 'metodo' }, 405);

  let corpo: any;
  try { corpo = await req.json(); } catch { return resp({ erro: 'json' }, 400); }

  const email = typeof corpo?.email === 'string' ? corpo.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@') || email.length > 160) return resp({ erro: 'email_invalido' }, 400);

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  // -------------------------------------------------------------------
  if (corpo?.acao === 'enviar') {
    const chave = Deno.env.get('RESEND_API_KEY');
    if (!chave) return resp({ erro: 'sem_chave' }, 503);

    const { data: existente } = await sb.from('recuperacao_codigos')
      .select('criado_em').eq('email', email).maybeSingle();
    if (existente && Date.now() - new Date(existente.criado_em).getTime() < THROTTLE_SEGUNDOS * 1000) {
      // já pediu há pouco — não reenvia, mas responde ok (o código anterior ainda vale)
      return resp({ ok: true });
    }

    const codigo = codigoAleatorio();
    const expira_em = new Date(Date.now() + VALIDADE_MIN * 60000).toISOString();
    const { error: eCod } = await sb.from('recuperacao_codigos')
      .upsert({ email, codigo, expira_em, tentativas: 0, criado_em: new Date().toISOString() }, { onConflict: 'email' });
    if (eCod) return resp({ erro: 'banco', detalhe: eCod.message }, 500);

    // Resposta sempre igual, exista ou não progresso salvo para este
    // e-mail — não é a Edge Function que deve revelar isso, e sim o
    // passo de confirmação, que já exige prova de acesso à caixa de
    // entrada antes de dizer qualquer coisa.
    const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F3EF;padding:28px 0">
<div style="max-width:480px;margin:0 auto;background:#FFFDFA;border:1px solid #C9CFDA;border-radius:5px;padding:30px 26px;font-family:Georgia,serif;color:#39414F;font-size:16px;line-height:1.7">
<p style="font-family:monospace;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#8A6212;margin:0 0 16px">RPG · O Jogador Consciente</p>
<h1 style="font-family:Georgia,serif;font-size:24px;color:#131722;margin:0 0 14px;line-height:1.15">Seu código para continuar.</h1>
<p style="margin:0 0 20px">Cola este código na tela onde você pediu para recuperar o jogo:</p>
<p style="font-family:monospace;font-size:34px;letter-spacing:.12em;color:#131722;background:#F5F1E6;border:1px solid #E0D6BC;border-radius:4px;padding:16px;text-align:center;margin:0 0 20px">${codigo}</p>
<p style="margin:0;color:#5A6478;font-size:14px">Vale por ${VALIDADE_MIN} minutos. Se não foi você que pediu, ignore este e-mail — ninguém consegue entrar sem este código.</p>
</div></body></html>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: REMETENTE,
        to: [email],
        subject: `${codigo} — seu código para continuar o jogo`,
        html,
        text: `Seu código: ${codigo}\nVale por ${VALIDADE_MIN} minutos. Se não foi você que pediu, ignore este e-mail.`,
      }),
    });
    if (!r.ok) {
      const res = await r.json().catch(() => ({}));
      return resp({ erro: 'resend', detalhe: res }, 502);
    }
    return resp({ ok: true });
  }

  // -------------------------------------------------------------------
  if (corpo?.acao === 'confirmar') {
    const codigo = typeof corpo?.codigo === 'string' ? corpo.codigo.trim() : '';
    if (!/^\d{6}$/.test(codigo)) return resp({ ok: false, erro: 'codigo_invalido' }, 400);

    const { data: registro } = await sb.from('recuperacao_codigos').select('*').eq('email', email).maybeSingle();
    if (!registro) return resp({ ok: false, erro: 'sem_codigo_pendente' }, 404);

    if (new Date(registro.expira_em).getTime() < Date.now()) {
      await sb.from('recuperacao_codigos').delete().eq('email', email);
      return resp({ ok: false, erro: 'codigo_expirado' }, 410);
    }
    if (registro.tentativas >= TENTATIVAS_MAX) {
      await sb.from('recuperacao_codigos').delete().eq('email', email);
      return resp({ ok: false, erro: 'muitas_tentativas' }, 429);
    }
    if (registro.codigo !== codigo) {
      await sb.from('recuperacao_codigos').update({ tentativas: registro.tentativas + 1 }).eq('email', email);
      return resp({ ok: false, erro: 'codigo_incorreto' }, 401);
    }

    // código certo — de uso único, apaga já
    await sb.from('recuperacao_codigos').delete().eq('email', email);

    // mesmo critério de desempate usado em ingestao e imersao-signup:
    // já ligado a um login > Autorretrato rico (chave "mapa") > qualquer
    // Autorretrato > mais recente.
    const { data: jogadores } = await sb.from('players')
      .select('player_id, nome, genero, data_nascimento, hora_nascimento, hora_incerta, cidade, uf, timezone, current_stage, reflection_selected, consentimentos, whatsapp, user_id, autorretrato_json, autorretrato_em, created_at')
      .ilike('email', email);

    if (!jogadores || !jogadores.length) return resp({ ok: true, encontrado: false });

    const pontuar = (r: any) => (r.user_id ? 4 : 0) + (r.autorretrato_json?.mapa ? 2 : 0) + (r.autorretrato_json ? 1 : 0);
    const ordenados = [...jogadores].sort((a, b) =>
      pontuar(b) - pontuar(a) ||
      new Date(b.autorretrato_em ?? b.created_at).getTime() - new Date(a.autorretrato_em ?? a.created_at).getTime());
    const j = ordenados[0];

    return resp({
      ok: true,
      encontrado: true,
      jogador: {
        player_id: j.player_id,
        nome: j.nome,
        email,
        whatsapp: j.whatsapp,
        genero: j.genero,
        data_nascimento: j.data_nascimento,
        hora_nascimento: j.hora_nascimento,
        hora_incerta: j.hora_incerta,
        cidade: j.cidade,
        uf: j.uf,
        timezone: j.timezone,
        current_stage: j.current_stage,
        reflection_selected: j.reflection_selected,
        consentimentos: j.consentimentos,
      },
    });
  }

  return resp({ erro: 'acao_invalida' }, 400);
});
