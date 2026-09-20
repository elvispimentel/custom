// RPG — O Jogador Consciente · envio da Ficha por e-mail (Resend)
// Chamada pelo jogador anônimo, então nada de confiar no que chega:
// o e-mail de destino vem SEMPRE da tabela, nunca do corpo da requisição.
// Senão vira máquina de mandar mensagem para terceiros.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REMETENTE = Deno.env.get('REMETENTE_FICHA') ?? 'O Jogador Consciente <onboarding@resend.dev>';
// Para onde vai a resposta de quem responder. Se não houver secret próprio,
// usa o endereço do remetente — que precisa ser uma caixa que alguém lê.
const RESPOSTA = Deno.env.get('RESPOSTA_FICHA') ?? (REMETENTE.match(/<([^>]+)>/)?.[1] ?? REMETENTE);
const LIMITE_MIN = 3; // no máximo um envio a cada 3 minutos por jogador

function resp(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ erro: 'metodo' }, 405);

  const chave = Deno.env.get('RESEND_API_KEY');
  if (!chave) return resp({ erro: 'sem_chave', mensagem: 'RESEND_API_KEY nao configurada' }, 503);

  let corpo: any;
  try { corpo = await req.json(); } catch { return resp({ erro: 'json' }, 400); }
  const pid = String(corpo?.player_id ?? '');
  if (!UUID.test(pid)) return resp({ erro: 'player_id invalido' }, 400);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } });

  const { data: p } = await sb.from('players')
    .select('nome, email, genero, consentimentos').eq('player_id', pid).maybeSingle();

  if (!p) return resp({ erro: 'jogador_desconhecido' }, 404);
  if (!p.email) return resp({ erro: 'sem_email' }, 400);
  if (p.consentimentos && p.consentimentos.relatorio === false)
    return resp({ erro: 'sem_consentimento' }, 403);

  // freio simples contra reenvio em rajada
  const desde = new Date(Date.now() - LIMITE_MIN * 60000).toISOString();
  const { count } = await sb.from('events').select('event_id', { count: 'exact', head: true })
    .eq('player_id', pid).eq('event_name', 'ficha_enviada').gte('ocorrido_em', desde);
  if ((count ?? 0) > 0) return resp({ ok: true, ja_enviado: true });

  const primeiro = (p.nome ?? '').trim().split(/\s+/)[0] || 'jogador';
  const trat = p.genero === 'f' ? 'Jogadora' : 'Jogador';
  const corpoHtml = typeof corpo?.html === 'string' ? corpo.html : '';

  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#F5F3EF;padding:28px 0">
<div style="max-width:560px;margin:0 auto;background:#FFFDFA;border:1px solid #C9CFDA;border-radius:5px;padding:30px 26px;font-family:Georgia,serif;color:#39414F;font-size:16px;line-height:1.7">
<p style="font-family:monospace;font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:#8A6212;margin:0 0 16px">RPG · O ${trat} Consciente</p>
<h1 style="font-family:Georgia,serif;font-size:27px;color:#131722;margin:0 0 14px;line-height:1.15">A sua ficha, ${esc(primeiro)}.</h1>
<p style="margin:0 0 16px">Está tudo aqui embaixo: a sua história e os seus dados, do jeito que o jogo gerou. Guarda esse e-mail — é dele que os Guardiões vão puxar ao longo dos portais.</p>

<div style="background:#F5F1E6;border:1px solid #E0D6BC;border-left:3px solid #C9A227;border-radius:4px;padding:16px 18px;margin:0 0 8px">
<p style="margin:0 0 10px;font-weight:bold;color:#131722">Uma coisa antes de você descer a página.</p>
<p style="margin:0 0 10px">Responde este e-mail com <b>uma linha só</b>: a ficha chegou inteira, ou faltou alguma coisa?</p>
<p style="margin:0">Não é formalidade. Eu leio cada resposta, e é ela que me diz se o jogo está entregando o que promete — ou onde ele ainda falha.</p>
</div>

<div style="border-top:1px solid #DCE1E8;margin:24px 0;padding-top:22px">${corpoHtml}</div>

<p style="margin:26px 0 0;padding-top:18px;border-top:1px solid #DCE1E8">Leu até aqui? Então me responde. Uma linha basta.<br><span style="color:#5A6478;font-size:14px">— Elvis</span></p>
<p style="font-family:monospace;font-size:11px;color:#5A6478;border-top:1px solid #DCE1E8;padding-top:16px;margin:20px 0 0">Você recebeu isto porque pediu a sua ficha no jogo. Se não foi você, ignore.</p>
</div></body></html>`;

  const texto = `A sua ficha, ${primeiro}.

Antes de tudo: responde este e-mail com uma linha só — a ficha chegou inteira, ou faltou alguma coisa? Eu leio cada resposta.

A sua ficha completa está na versão em HTML desta mensagem.

— Elvis
RPG · O ${trat} Consciente`;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: REMETENTE,
      to: [p.email],
      reply_to: RESPOSTA,
      subject: `A sua ficha — ${primeiro}`,
      html,
      text: texto,
    }),
  });

  const res = await r.json().catch(() => ({}));
  if (!r.ok) return resp({ erro: 'resend', status: r.status, detalhe: res }, 502);

  await sb.from('events').insert({
    event_id: crypto.randomUUID(), player_id: pid, event_name: 'ficha_enviada',
    ocorrido_em: new Date().toISOString(), metadata: { resend_id: res?.id ?? null },
  });

  return resp({ ok: true, id: res?.id ?? null });
});
