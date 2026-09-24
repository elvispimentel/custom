// daily-compass-notify — dispara o aviso da Bússola Diária pelos dois canais
// decididos (app + e-mail; WhatsApp/push ficam para depois, por decisão do Elvis).
// "App" não precisa de código aqui: a coluna imersao_daily_compass_cards.lido_em
// já existe e já é a ponte — nula = não lido, e o futuro front-end real só
// precisa checar isso para mostrar o badge. Esta função cuida só do e-mail,
// e marca notificado_em pra nunca mandar duas vezes o mesmo card.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  try {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY não encontrada nos secrets desta função" }), { status: 500 });
    }
    const remetente = Deno.env.get("RESEND_FROM") || "Bússola Diária <onboarding@resend.dev>";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const hoje = new Date().toISOString().slice(0, 10);

    let consulta = supabase.from("imersao_daily_compass_cards").select("id, user_id, dia, card")
      .eq("estado", "pronto").is("notificado_em", null);
    if (body.user_id) consulta = consulta.eq("user_id", body.user_id);
    else consulta = consulta.eq("dia", hoje);
    const { data: pendentes, error: eP } = await consulta;
    if (eP) throw eP;

    const resultados = [];
    for (const c of pendentes || []) {
      try {
        const { data: jogador } = await supabase.from("players").select("nome, email").eq("user_id", c.user_id).maybeSingle();
        if (!jogador?.email) { resultados.push({ user_id: c.user_id, ok: false, motivo: "jogador sem e-mail" }); continue; }

        const card = c.card || {};
        const html = `<div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px">
          <p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8A6212">Bússola Diária do Jogador</p>
          <h2 style="font-size:20px">${card.headline || "Sua leitura de hoje está pronta."}</h2>
          <p style="font-size:15px;line-height:1.6;color:#333">${card.greeting || ""}</p>
          <p style="font-size:14px;color:#666">Abra o app para ver a leitura completa do dia.</p>
        </div>`;

        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: remetente,
            to: jogador.email,
            subject: card.headline || "Sua Bússola Diária está pronta",
            html,
          }),
        });
        if (!resp.ok) throw new Error(`Resend ${resp.status}: ${await resp.text()}`);

        const { error: eUpd } = await supabase.from("imersao_daily_compass_cards")
          .update({ notificado_em: new Date().toISOString() }).eq("id", c.id);
        if (eUpd) throw eUpd;
        resultados.push({ user_id: c.user_id, ok: true });
      } catch (e) {
        resultados.push({ user_id: c.user_id, ok: false, erro: String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, processados: resultados.length, resultados }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error(erro);
    return new Response(JSON.stringify({ ok: false, error: String(erro) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
