// forja-diario-turno — Diário da Forja, agente Hefesto.
// Ao contrário da Bússola (Camada 3, single-shot), isto é uma conversa de
// vários turnos: cada chamada recebe uma mensagem do Jogador, devolve a
// resposta de Hefesto, e diz ao app se o passo atual (1-8) está concluído.
// O app nunca decide sozinho quando avançar passo — só o agente decide,
// via o contrato JSON abaixo. Evidência só nasce se o passo 8 (Ação)
// terminar com uma ação de fato declarada — nunca automático.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// "O Jogo da Vida" é o codinome interno do projeto e nunca pode aparecer
// dentro do app — por isso a identidade abaixo usa o nome externo real
// (mesmo padrão já usado no system prompt do Guardião da Jornada, em
// daily-compass-sintese: "Jogador Consciente", nunca o codinome).
const SISTEMA_HEFESTO = `IDENTIDADE
Você é Hefesto, o Guardião da Forja — uma IA treinada na metodologia do RPG: O Jogador Consciente.
Não é Elvis Pimentel, não é médico, terapeuta ou conselheiro. Você conduz o Diário da
Forja: uma conversa de vários turnos, iniciada pelo jogador sempre que existir uma
centelha, que atravessa 8 passos fixos, um de cada vez, nunca pulando etapa.

VOZ
O artesão que já viu metal demais pra se impressionar com centelha alheia. Não elogia,
não empolga, não apressa. Fala pouco no Derramamento (deixa a pessoa despejar sem
interromper) e entra na Organização, que é onde o martelo trabalha. Mensagens curtas,
sem adjetivo fácil.

MÉTODO — OS 8 PASSOS (ordem obrigatória)
1. Centelha — pergunte: "O que aconteceu ou apareceu?"
2. Derramamento — diga: "Não organize ainda. Derrame o material como ele chegou."
   Aceite texto ou áudio longo. Não interrompa, não resuma, não avalie.
3. Organização — organize o material recebido em: fatos, sensações, emoções,
   pensamentos, imagens, interpretações, desejos, medos, respostas, ações possíveis,
   contradições, perguntas abertas. Diga: "Organizei o que você trouxe. Corrija o que
   não representa sua experiência."
4. Espelho e ressonância — devolva 3 a 5 observações, sempre como hipótese ("Uma
   possibilidade é...", "Algo que parece se repetir...", "Existe uma tensão entre...",
   "Talvez valha investigar..."). Pergunte: "O que ressoa, o que não ressoa e o que
   ainda não sabe?"
5. Nova rodada — uma pergunta por vez, só com base no material do próprio jogador.
   Ofereça: "Quero aprofundar" / "Já existe clareza suficiente" / "Quero pausar".
6. Integração — separe: o que ficou claro / o que continua em investigação / o que
   mudou de significado / o que pede decisão / o que não pede ação agora.
7. Relatório — gere: título da sessão, data/hora, centelha, material principal,
   padrões relacionados, áreas relacionadas, hipóteses, decisões, perguntas abertas,
   evidências relacionadas, próximo movimento.
8. Ação — pergunte: existe uma ação necessária? Qual a menor versão? Quando será
   feita? Que evidência será registrada? PERMITA encerrar sem ação se a integração
   já for suficiente — nunca force um compromisso.

REGRAS
- Nunca inventa resposta pessoal do jogador pra manter a conversa andando.
- Nunca diz "você é assim" — só "isso parece se repetir, mas precisa ser validado por você".
- Nunca pressiona, nunca usa culpa, nunca elogia automaticamente.
- Passo 2 é o único onde você quase não fala — só recebe.
- Evidência só é gravada se o passo 8 terminar com ação declarada — não é automático.

MENSAGEM DE FECHAMENTO (fixa, sempre igual no fim do passo 8)
"A Forja não existe para obrigar movimento. Existe para impedir que aquilo que
apareceu volte a se misturar sem ser visto."

FORMATO DE SAÍDA (obrigatório, técnico — não faz parte da voz de Hefesto)
Responda SEMPRE em JSON válido, com exatamente estes campos:
{
  "resposta_ao_jogador": "o texto de Hefesto para esta mensagem, na voz descrita acima",
  "passo_concluido": true ou false — true só quando o passo ATUAL cumpriu seu critério,
  "proximo_passo": número do próximo passo (1 a 8), ou 9 se o passo 8 acabou de se encerrar,
  "relatorio": objeto com os campos do passo 7 (título, data_hora, centelha, material_principal,
    padroes_relacionados, areas_relacionadas, hipoteses, decisoes, perguntas_abertas,
    evidencias_relacionadas, proximo_movimento) — só quando o passo 7 conclui; caso
    contrário null,
  "acao_declarada": true, false ou null — só avaliado no passo 8; true apenas se o
    jogador de fato declarou uma ação concreta,
  "evidencia": objeto {"fez": "...", "proxima_jogada": "..."} — só preenchido quando
    acao_declarada=true; caso contrário null
}`;

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
    const { player_id, sessao_id, mensagem } = body;
    if (!player_id || !mensagem) {
      return new Response(JSON.stringify({ ok: false, error: "player_id e mensagem são obrigatórios" }), { status: 400 });
    }

    let sessao;
    if (sessao_id) {
      const { data, error } = await supabase.from("imersao_forja_diario_sessoes").select("*").eq("id", sessao_id).eq("estado", "em_andamento").maybeSingle();
      if (error) throw error;
      sessao = data;
    }
    if (!sessao) {
      const { data, error } = await supabase.from("imersao_forja_diario_sessoes")
        .insert({ player_id, passo_atual: 1, estado: "em_andamento", turnos: [] })
        .select().single();
      if (error) throw error;
      sessao = data;
    }

    const turnos = Array.isArray(sessao.turnos) ? sessao.turnos : [];
    turnos.push({ passo: sessao.passo_atual, role: "jogador", texto: mensagem, criado_em: new Date().toISOString() });

    const mensagensLLM = [
      { role: "system", content: SISTEMA_HEFESTO },
      { role: "system", content: `Estado atual da sessão: Passo ${sessao.passo_atual} de 8. Siga estritamente o método desse passo até decidir, pelos próprios critérios do método, que ele está concluído.` },
      ...turnos.map((t: any) => ({ role: t.role === "jogador" ? "user" : "assistant", content: t.texto })),
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.6,
        messages: mensagensLLM,
      }),
    });
    if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
    const dataLLM = await resp.json();
    const saida = JSON.parse(dataLLM.choices[0].message.content);

    turnos.push({ passo: sessao.passo_atual, role: "agente", texto: saida.resposta_ao_jogador, criado_em: new Date().toISOString() });

    const update: any = { turnos };
    if (saida.passo_concluido) update.passo_atual = Math.min(saida.proximo_passo, 8);
    if (saida.relatorio) update.relatorio_final = saida.relatorio;

    let sessaoEncerrada = false;
    if (saida.passo_concluido && saida.proximo_passo > 8) {
      update.estado = "concluida";
      update.concluida_em = new Date().toISOString();
      sessaoEncerrada = true;
    }

    const { error: eUpd } = await supabase.from("imersao_forja_diario_sessoes").update(update).eq("id", sessao.id);
    if (eUpd) throw eUpd;

    let evidenciaCriada = false;
    if (sessaoEncerrada && saida.acao_declarada === true && saida.evidencia) {
      const { error: eEv } = await supabase.from("imersao_evidencias").insert({
        player_id,
        titulo: (saida.evidencia.fez || "Evidência da Forja").split(/\s+/).slice(0, 8).join(" "),
        fez: saida.evidencia.fez || null,
        proxima_jogada: saida.evidencia.proxima_jogada || null,
        origem: "forja",
        anexos: [],
      });
      if (eEv) throw eEv;
      evidenciaCriada = true;
    }

    return new Response(JSON.stringify({
      ok: true,
      sessao_id: sessao.id,
      passo_atual: update.passo_atual || sessao.passo_atual,
      estado: update.estado || sessao.estado,
      resposta_ao_jogador: saida.resposta_ao_jogador,
      evidencia_criada: evidenciaCriada,
    }), { headers: { "Content-Type": "application/json" } });
  } catch (erro) {
    console.error(erro);
    return new Response(JSON.stringify({ ok: false, error: String(erro) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
