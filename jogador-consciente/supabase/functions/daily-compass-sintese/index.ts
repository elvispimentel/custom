// daily-compass-sintese — Camada 3 da Bússola Diária do Jogador.
// Pega o cruzamento já calculado (Camada 2, determinístico) e pede a um LLM
// que escreva o card do dia, na voz do Guardião da Jornada — nunca o LLM
// calcula portão/canal/centro, só interpreta o que já foi calculado.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SISTEMA = `Você é o Guardião da Jornada, escrevendo o card diário da Bússola do Jogador Consciente.

Regras não-negociáveis:
- Nunca "seu mapa diz que você deve", "os astros mandam", "hoje é o dia certo para X" como sentença fechada.
- Toda leitura é possibilidade, nunca destino. Feche sempre em pergunta ou convite, nunca em ordem.
- Lista negativa vinculante — nunca use: "o universo quer", "você precisa", "isso vai curar", "eu garanto", "como Elvis faria".
- Se não houver nenhuma ativação pessoal nem definição temporária hoje, diga isso com honestidade — não invente conteúdo para preencher o card.
- Todo termo técnico (nome de centro, "ativação pessoal", "definição temporária", Estratégia, Autoridade) precisa vir com uma explicação em linguagem comum na mesma frase ou no glossário — nenhum jargão de Desenho Humano sem tradução. O card precisa ser legível por alguém que nunca ouviu falar nisso.
- Cubra TODAS as ativações pessoais e TODAS as definições temporárias recebidas — não corte por brevidade.
- Responda em JSON válido, só com os campos pedidos, nada fora do JSON.`;

function montarPrompt(nome: string, mapa: any, cruzamento: any) {
  return `Jogador: ${nome || "o Jogador"}
Tipo: ${mapa.tipo} · Autoridade: ${mapa.autoridade} · Estratégia: ${mapa.estrategia} · Perfil: ${mapa.perfil}

Ativações pessoais de hoje (portões do céu que também estão no mapa do Jogador):
${JSON.stringify(cruzamento.personal_matches)}

Definições temporárias de hoje (canais que se fecham só por hoje, num centro que normalmente está aberto):
${JSON.stringify(cruzamento.temp_definitions)}

Escreva o card do dia como um objeto JSON com exatamente estes campos:
{
  "greeting": "saudação curta, cita o nome se houver",
  "headline": "uma frase central do dia, a partir da ativação mais forte (ou do silêncio, se não houver nenhuma)",
  "gifts": ["até 3 frases curtas — o que essas ativações favorecem hoje"],
  "shadows": ["até 3 frases curtas — o lado sombra da mesma energia, sem alarmismo"],
  "domains": { "trabalho": "uma frase", "relacionamento": "uma frase", "saude": "uma frase" },
  "closing_question": "uma pergunta aberta, nunca uma ordem",
  "glossary": [{"termo":"...", "explicacao":"..."}]
}`;
}

Deno.serve(async (req: Request) => {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ ok: false, error: "OPENAI_API_KEY não encontrada nos secrets desta função" }), { status: 500 });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const hoje = new Date().toISOString().slice(0, 10);

    let consulta = supabase.from("imersao_daily_compass_cards").select("id, user_id, cruzamento, dia").eq("estado", "pendente");
    if (body.user_id) consulta = supabase.from("imersao_daily_compass_cards").select("id, user_id, cruzamento, dia").eq("user_id", body.user_id).eq("dia", hoje);
    const { data: pendentes, error: eP } = await consulta;
    if (eP) throw eP;

    const resultados = [];
    for (const p of pendentes || []) {
      try {
        const { data: jogador } = await supabase.from("players").select("nome, autorretrato_json").eq("user_id", p.user_id).maybeSingle();
        const mapa = jogador?.autorretrato_json?.mapa || jogador?.autorretrato_json;
        if (!mapa) { resultados.push({ user_id: p.user_id, ok: false, motivo: "sem mapa" }); continue; }

        const silencio = p.cruzamento.personal_matches.length === 0 && p.cruzamento.temp_definitions.length === 0;

        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0.7,
            messages: [
              { role: "system", content: SISTEMA },
              { role: "user", content: montarPrompt(jogador?.nome, mapa, p.cruzamento) },
            ],
          }),
        });
        if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
        const dataLLM = await resp.json();
        const card = JSON.parse(dataLLM.choices[0].message.content);

        // Checagem automática da lista negativa vinculante — se pegar algo, manda para revisão humana em vez de publicar sozinho.
        const textoCompleto = JSON.stringify(card).toLowerCase();
        const proibidas = ["o universo quer", "você precisa", "isso vai curar", "eu garanto", "como elvis faria", "você deve"];
        const bateuProibida = proibidas.some((p2) => textoCompleto.includes(p2));

        const { error: eUpd } = await supabase.from("imersao_daily_compass_cards")
          .update({ card, estado: bateuProibida ? "revisao" : "pronto", silencio, gerado_em: new Date().toISOString() })
          .eq("id", p.id);
        if (eUpd) throw eUpd;
        resultados.push({ user_id: p.user_id, ok: true, estado: bateuProibida ? "revisao" : "pronto" });
      } catch (e) {
        await supabase.from("imersao_daily_compass_cards").update({ estado: "falhou", erro: String(e) }).eq("id", p.id);
        resultados.push({ user_id: p.user_id, ok: false, erro: String(e) });
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
