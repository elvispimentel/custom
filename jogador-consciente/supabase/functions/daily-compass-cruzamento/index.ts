// daily-compass-cruzamento — Camada 2 da Bússola Diária do Jogador.
// Cruza o céu do dia (imersao_daily_ephemeris) com o mapa de cada Jogador
// (players.autorretrato_json) e grava o resultado estruturado em
// imersao_daily_compass_cards.cruzamento, estado='pendente' (aguardando a
// Camada 3 — síntese com IA — que ainda depende da chave OPENAI_API_KEY).
// Determinístico — nenhuma IA envolvida aqui.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CENTROS: Record<string, number[]> = {
  Cabeca: [64, 61, 63], Ajna: [47, 24, 4, 17, 43, 11],
  Garganta: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  G: [7, 1, 13, 25, 46, 2, 15, 10], Coracao: [21, 40, 26, 51],
  Sacral: [34, 5, 14, 29, 59, 9, 3, 42, 27], PlexoSolar: [6, 37, 22, 36, 30, 55, 49],
  Baco: [48, 57, 44, 50, 32, 28, 18], Raiz: [53, 60, 52, 19, 39, 41, 58, 38, 54],
};
const PORTAO_CENTRO: Record<number, string> = {};
for (const [c, gs] of Object.entries(CENTROS)) for (const g of gs) PORTAO_CENTRO[g] = c;
const CANAIS: [number, number][] = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48], [17, 62],
  [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43], [24, 61], [25, 51],
  [26, 44], [27, 50], [28, 38], [29, 46], [30, 41], [32, 54], [34, 57], [35, 36],
  [37, 40], [39, 55], [42, 53], [47, 64],
];

// Aceita os dois formatos que hoje escrevem em autorretrato_json:
// o meu (plano, calculate-natal-chart) e o do rpgojc (aninhado em "mapa",
// mesmo motor.mjs — mesmas chaves internas, um nível mais fundo).
function extrairMapa(autorretrato: any): any | null {
  if (!autorretrato || typeof autorretrato !== "object") return null;
  const m = autorretrato.mapa && typeof autorretrato.mapa === "object" ? autorretrato.mapa : autorretrato;
  if (!m.ativacoes || !m.centrosAbertos) return null;
  return m;
}

function gatesDoJogador(mapa: any): Set<number> {
  const out = new Set<number>();
  for (const lado of ["personalidade", "design"]) {
    const bloco = mapa.ativacoes?.[lado];
    if (!bloco) continue;
    for (const corpo of Object.keys(bloco)) out.add(bloco[corpo].portao);
  }
  return out;
}

function cruzar(gatesTransito: number[], mapa: any) {
  const meusGates = gatesDoJogador(mapa);
  const centrosAbertos = new Set<string>(mapa.centrosAbertos || []);

  const personal_matches = gatesTransito
    .filter((g) => meusGates.has(g))
    .map((g) => ({ gate: g, nota: "Este portão do céu de hoje também está no seu mapa pessoal." }));

  const temp_definitions: any[] = [];
  for (const [a, b] of CANAIS) {
    const aNoTransito = gatesTransito.includes(a), bNoTransito = gatesTransito.includes(b);
    const aNoJogador = meusGates.has(a), bNoJogador = meusGates.has(b);
    // "temporária" = um lado vem do céu de hoje, o outro é seu — e o centro
    // ligado por esse canal normalmente está aberto (não é definição permanente sua).
    const fecha = (aNoTransito && bNoJogador) || (bNoTransito && aNoJogador);
    if (!fecha) continue;
    const centroA = PORTAO_CENTRO[a], centroB = PORTAO_CENTRO[b];
    const centroAberto = [centroA, centroB].find((c) => centrosAbertos.has(c));
    if (!centroAberto) continue; // já é definido no seu mapa — não é "emprestado" por hoje
    temp_definitions.push({ canal: [a, b], centro: centroAberto });
  }

  return { personal_matches, temp_definitions };
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const hoje = new Date().toISOString().slice(0, 10);

    const { data: efem, error: eEfem } = await supabase
      .from("imersao_daily_ephemeris").select("gates_ativos").eq("dia", hoje).maybeSingle();
    if (eEfem) throw eEfem;
    if (!efem) return new Response(JSON.stringify({ ok: false, error: "efeméride de hoje ainda não foi calculada — rode daily-ephemeris-cron primeiro" }), { status: 409 });

    let consultaConsentimento = supabase.from("imersao_compass_consents").select("user_id").eq("ativo", true);
    if (body.user_id) consultaConsentimento = supabase.from("imersao_compass_consents").select("user_id").eq("user_id", body.user_id);
    const { data: consentimentos, error: eCons } = await consultaConsentimento;
    if (eCons) throw eCons;

    const resultados = [];
    const semMapa = [];
    for (const c of consentimentos || []) {
      const { data: jogador, error: eJog } = await supabase
        .from("players").select("player_id, autorretrato_json").eq("user_id", c.user_id).maybeSingle();
      if (eJog || !jogador) { semMapa.push({ user_id: c.user_id, motivo: "sem players.user_id correspondente" }); continue; }
      const mapa = extrairMapa(jogador.autorretrato_json);
      if (!mapa) { semMapa.push({ user_id: c.user_id, motivo: "autorretrato ainda não calculado" }); continue; }

      const cruzamento = cruzar(efem.gates_ativos, mapa);
      const { error: eCard } = await supabase.from("imersao_daily_compass_cards").upsert({
        user_id: c.user_id, dia: hoje, cruzamento, estado: "pendente", silencio: cruzamento.personal_matches.length === 0 && cruzamento.temp_definitions.length === 0,
      }, { onConflict: "user_id,dia" });
      if (eCard) throw eCard;
      resultados.push({ user_id: c.user_id, personal_matches: cruzamento.personal_matches.length, temp_definitions: cruzamento.temp_definitions.length });
    }

    return new Response(JSON.stringify({ ok: true, processados: resultados.length, resultados, semMapa }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error(erro);
    return new Response(JSON.stringify({ ok: false, error: String(erro) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
