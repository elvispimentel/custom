import { createClient } from 'npm:@supabase/supabase-js@2';

// Escoa a fila de jogadores para a planilha do Google (Apps Script).
// Roda a cada minuto, chamada pelo pg_cron. Se a planilha estiver fora do ar,
// nada e marcado como enviado e a proxima rodada tenta de novo.

const sb = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async () => {
  try {
    const { data: cfg } = await sb
      .from('config_integracao').select('valor').eq('chave', 'planilha_url').maybeSingle();
    const destino = cfg?.valor;
    if (!destino) {
      return new Response(JSON.stringify({ ok: true, motivo: 'planilha_url ainda nao configurada' }),
        { headers: { 'Content-Type': 'application/json' } });
    }

    const { data: fila, error } = await sb
      .from('planilha_fila').select('id, carga')
      .is('enviado_em', null).lt('tentativas', 5)
      .order('id').limit(200);
    if (error) throw new Error(error.message);
    if (!fila || !fila.length) {
      return new Response(JSON.stringify({ ok: true, enviadas: 0 }),
        { headers: { 'Content-Type': 'application/json' } });
    }

    const ids = fila.map((f) => f.id);
    let sucesso = false, detalhe = '';
    try {
      const r = await fetch(destino, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas: fila.map((f) => f.carga) }),
        redirect: 'follow',
      });
      detalhe = (await r.text()).slice(0, 300);
      sucesso = r.ok && detalhe.indexOf('"ok":true') >= 0;
    } catch (e) {
      detalhe = String(e);
    }

    if (sucesso) {
      await sb.from('planilha_fila').update({ enviado_em: new Date().toISOString(), erro: null }).in('id', ids);
    } else {
      for (const f of fila) {
        await sb.rpc('planilha_falhou', { p_id: f.id, p_erro: detalhe });
      }
    }

    return new Response(JSON.stringify({ ok: sucesso, enviadas: sucesso ? ids.length : 0, detalhe }),
      { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
