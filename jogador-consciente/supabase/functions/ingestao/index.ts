// RPG — O Jogador Consciente · ingestão
// Recebe o jogador e a fila de eventos do navegador e grava com chave de
// serviço. O navegador nunca toca nas tabelas: RLS nega tudo para anon.
// verify_jwt fica desligado porque quem chama é um jogador anônimo, sem
// login — a proteção é validação de formato, teto de tamanho e o fato de
// só existir upsert do próprio player_id.
//
// RECONCILIAÇÃO POR E-MAIL (corrige duplicação de players): o player_id
// nasce no localStorage do navegador e nunca muda — mas o navegador pode
// ser limpo, trocado, ou a pessoa pode passar pelo funil mais de uma vez.
// Sem isso, cada passagem cria uma linha nova em `players`. Toda vez que o
// payload traz e-mail, procuramos uma linha JÁ existente com esse e-mail;
// se achar, o upsert vai para o player_id dela (o "canônico"), nunca para
// o que chegou no payload — e os eventos já gravados sob o player_id
// descartável são realocados para o canônico. O player_id canônico volta
// na resposta; o cliente deve adotá-lo (ver `jogador` na resposta).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TETO_EVENTOS = 300;
const TETO_AUTORRETRATO_BYTES = 400_000; // ~400KB, folga generosa sobre os 60-120KB esperados

function texto(v: unknown, max = 300): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}
function resp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resp({ erro: 'metodo' }, 405);

  let corpo: any;
  try { corpo = await req.json(); } catch { return resp({ erro: 'json' }, 400); }

  const j = corpo?.jogador ?? {};
  const pid = String(j.player_id ?? '');
  if (!UUID.test(pid)) return resp({ erro: 'player_id invalido' }, 400);

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  const email = texto(j.email, 160)?.toLowerCase() ?? null;

  // Acha o player_id canônico: se já existe alguém com este e-mail (sob
  // outro player_id), a escrita vai para a linha dele — nunca cria uma
  // segunda. Critério de escolha quando há mais de um candidato: já ligado
  // a um login (user_id) > já tem Autorretrato rico do rpgojc (chave
  // "mapa") > qualquer Autorretrato > o mais antigo (created_at menor).
  let canonicalPid = pid;
  let autorretratoExistente: any = null;
  if (email) {
    const { data: existentes } = await sb.from('players')
      .select('player_id, user_id, autorretrato_json, created_at')
      .ilike('email', email)
      .neq('player_id', pid);
    if (existentes && existentes.length) {
      const pontuar = (r: any) =>
        (r.user_id ? 4 : 0) + (r.autorretrato_json?.mapa ? 2 : 0) + (r.autorretrato_json ? 1 : 0);
      existentes.sort((a, b) =>
        pontuar(b) - pontuar(a) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      canonicalPid = existentes[0].player_id;
      autorretratoExistente = existentes[0].autorretrato_json ?? null;
    }
  }

  const genero = ['m', 'f', 'n'].includes(j.genero) ? j.genero : null;
  const data = typeof j.data_nascimento === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(j.data_nascimento)
    ? j.data_nascimento : null;
  const hora = typeof j.hora_nascimento === 'string' && /^\d{2}:\d{2}$/.test(j.hora_nascimento)
    ? j.hora_nascimento : null;

  const linha: Record<string, unknown> = {
    player_id: canonicalPid,
    nome: texto(j.nome, 120),
    email,
    whatsapp: texto(j.whatsapp, 40),
    genero,
    data_nascimento: data,
    hora_nascimento: hora,
    hora_incerta: !!j.hora_incerta,
    cidade: texto(j.cidade, 120),
    uf: texto(j.uf, 2),
    timezone: texto(j.timezone, 60),
    current_stage: Number.isFinite(+j.current_stage) ? Math.max(0, Math.min(9, +j.current_stage)) : 0,
    reflection_selected: texto(j.reflection_selected, 600),
    autorretrato_em: j.autorretrato_em ?? null,
    source: texto(j.source, 120),
    utm_source: texto(j.utm_source, 120),
    utm_medium: texto(j.utm_medium, 120),
    utm_campaign: texto(j.utm_campaign, 120),
    utm_content: texto(j.utm_content, 120),
    utm_term: texto(j.utm_term, 120),
    first_touch: j.first_touch ?? null,
    last_touch: j.last_touch ?? null,
    consentimentos: j.consentimentos ?? {},
    app_versao: texto(j.app_versao, 20),
  };

  // Autorretrato completo — gravado só quando vier preenchido, e nunca usado
  // para apagar um retrato já salvo (o app só manda quando acabou de gerar).
  // Nunca sobrescreve o formato rico do rpgojc (chave "mapa") com um mais
  // simples — mesma guarda já usada em calculate-natal-chart.
  if (j.autorretrato && typeof j.autorretrato === 'object') {
    const temMapaExistente = !!autorretratoExistente?.mapa;
    const incomingTemMapa = !!(j.autorretrato as any)?.mapa;
    const serializado = JSON.stringify(j.autorretrato);
    if (serializado.length <= TETO_AUTORRETRATO_BYTES && (!temMapaExistente || incomingTemMapa)) {
      linha.autorretrato_json = j.autorretrato;
    }
    // Payload maior que o teto, ou tentando pisar num formato rico já
    // salvo: ignora silenciosamente esse campo, o resto do upsert segue.
  }

  for (const k of Object.keys(linha)) if (linha[k] === null || linha[k] === undefined) delete linha[k];
  linha.player_id = canonicalPid;

  const { error: e1 } = await sb.from('players').upsert(linha, { onConflict: 'player_id' });
  if (e1) return resp({ erro: 'jogador', detalhe: e1.message }, 500);

  // Realoca para o canônico qualquer evento que já tenha sido gravado sob o
  // player_id descartável desta sessão (de uma passagem anterior pelo funil
  // antes deste player_id ser reconciliado).
  if (canonicalPid !== pid) {
    await sb.from('events').update({ player_id: canonicalPid }).eq('player_id', pid);
  }

  const brutos = Array.isArray(corpo?.eventos) ? corpo.eventos.slice(0, TETO_EVENTOS) : [];
  const eventos = brutos
    .filter((e: any) => UUID.test(String(e?.event_id ?? '')) && typeof e?.event_name === 'string')
    .map((e: any) => ({
      event_id: e.event_id,
      player_id: canonicalPid,
      event_name: String(e.event_name).slice(0, 80),
      ocorrido_em: e.timestamp ?? new Date().toISOString(),
      session_id: UUID.test(String(e.session_id ?? '')) ? e.session_id : null,
      screen: texto(e.screen, 60),
      utm: e.utm ?? null,
      metadata: e.metadata ?? {},
    }));

  let gravados = 0;
  if (eventos.length) {
    // ignoreDuplicates: reenviar a mesma fila não duplica nada
    const { error: e2, count } = await sb.from('events')
      .upsert(eventos, { onConflict: 'event_id', ignoreDuplicates: true, count: 'exact' });
    if (e2) return resp({ erro: 'eventos', detalhe: e2.message }, 500);
    gravados = count ?? eventos.length;
  }

  // jogador: devolve o player_id CANÔNICO, que pode ser diferente do que o
  // cliente enviou — o cliente deve adotar este valor (sobrescrever o seu
  // player_id local) para parar de criar linha nova a cada passagem.
  return resp({ ok: true, jogador: canonicalPid, eventos_recebidos: eventos.length, eventos_gravados: gravados });
});
