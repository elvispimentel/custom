// calculate-natal-chart — calcula o mapa de Desenho Humano (Tipo, Estratégia,
// Autoridade, Perfil, Centros definidos/abertos, e os 13 corpos em Personalidade
// e Design) a partir dos dados já capturados em `players` (data/hora/cidade/tz).
// Grava em players.autorretrato_json — NÃO cria uma tabela separada (decisão
// já tomada: evitar duplicar o motor de mapa; a Bússola lê direto daqui).
//
// Portado, ponto por ponto, do motor já validado e em produção no rpgojc
// (arquivo "motor.mjs", já documentado lá como "roda em Node, Deno e navegador").
// Determinístico — nenhuma IA envolvida.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as Astro from "npm:astronomy-engine@2";

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const norm360 = (x: number) => ((x % 360) + 360) % 360;

function offsetMs(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const { type, value } of dtf.formatToParts(date)) p[type] = value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - date.getTime();
}
function localParaUTC({ ano, mes, dia, hora = 12, minuto = 0, tz }: { ano: number; mes: number; dia: number; hora?: number; minuto?: number; tz: string }) {
  const alvo = Date.UTC(ano, mes - 1, dia, hora, minuto, 0);
  let ms = alvo;
  for (let i = 0; i < 4; i++) ms = alvo - offsetMs(new Date(ms), tz);
  return new Date(ms);
}

const CORPOS_ASTRO: Record<string, any> = {
  Sol: Astro.Body.Sun, Lua: Astro.Body.Moon, Mercurio: Astro.Body.Mercury,
  Venus: Astro.Body.Venus, Marte: Astro.Body.Mars, Jupiter: Astro.Body.Jupiter,
  Saturno: Astro.Body.Saturn, Urano: Astro.Body.Uranus, Netuno: Astro.Body.Neptune,
  Plutao: Astro.Body.Pluto,
};
function eqjParaEclipticaDaData(vec: any, time: any) {
  const rot = Astro.Rotation_EQJ_ECT(time);
  const v = Astro.RotateVector(rot, vec);
  const lon = norm360(Math.atan2(v.y, v.x) * R2D);
  return { lon };
}
function eqjParaEclipticaVec(vec: any, time: any) {
  const rot = Astro.Rotation_EQJ_ECT(time);
  return Astro.RotateVector(rot, vec);
}
function nodoLunarVerdadeiro(time: any) {
  const dt = 1 / 1440;
  const t1 = time.AddDays(-dt), t2 = time.AddDays(dt);
  const p1 = Astro.GeoMoon(t1), p2 = Astro.GeoMoon(t2), p0 = Astro.GeoMoon(time);
  const e0 = eqjParaEclipticaVec(p0, time);
  const e1 = eqjParaEclipticaVec(p1, time);
  const e2 = eqjParaEclipticaVec(p2, time);
  const v = { x: (e2.x - e1.x) / (2 * dt), y: (e2.y - e1.y) / (2 * dt), z: (e2.z - e1.z) / (2 * dt) };
  const h = { x: e0.y * v.z - e0.z * v.y, y: e0.z * v.x - e0.x * v.z, z: e0.x * v.y - e0.y * v.x };
  return norm360(Math.atan2(h.x, -h.y) * R2D);
}
function posicoes(dataUTC: Date) {
  const time = Astro.MakeTime(dataUTC);
  const out: Record<string, number> = {};
  for (const [nome, body] of Object.entries(CORPOS_ASTRO)) {
    const vec = Astro.GeoVector(body as any, time, true);
    out[nome] = eqjParaEclipticaDaData(vec, time).lon;
  }
  out.Terra = norm360(out.Sol + 180);
  out.NodoNorte = nodoLunarVerdadeiro(time);
  out.NodoSul = norm360(out.NodoNorte + 180);
  return out;
}
// Instante em que o Sol esteve 88° antes do Sol natal — busca binária.
function dataDesign(dataUTC: Date) {
  const t0 = Astro.MakeTime(dataUTC);
  const solNatal = eqjParaEclipticaDaData(Astro.GeoVector(Astro.Body.Sun, t0, true), t0).lon;
  const alvo = norm360(solNatal - 88);
  const f = (dias: number) => {
    const t = t0.AddDays(dias);
    const l = eqjParaEclipticaDaData(Astro.GeoVector(Astro.Body.Sun, t, true), t).lon;
    let d = norm360(l - alvo);
    if (d > 180) d -= 360;
    return d;
  };
  let lo = -95, hi = -80;
  let flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) { lo = -100; hi = -75; flo = f(lo); fhi = f(hi); }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return new Date(t0.AddDays((lo + hi) / 2).date.getTime());
}

const RODA_PORTOES = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];
const INICIO_RODA = 302.0;
const ARCO_PORTAO = 360 / 64;
function portaoDe(lonGrau: number) {
  const rel = norm360(lonGrau - INICIO_RODA);
  const idx = Math.floor(rel / ARCO_PORTAO);
  const dentro = rel - idx * ARCO_PORTAO;
  const linha = Math.floor(dentro / (ARCO_PORTAO / 6)) + 1;
  return { portao: RODA_PORTOES[idx], linha };
}

const CENTROS: Record<string, number[]> = {
  Cabeca: [64, 61, 63], Ajna: [47, 24, 4, 17, 43, 11],
  Garganta: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  G: [7, 1, 13, 25, 46, 2, 15, 10], Coracao: [21, 40, 26, 51],
  Sacral: [34, 5, 14, 29, 59, 9, 3, 42, 27], PlexoSolar: [6, 37, 22, 36, 30, 55, 49],
  Baco: [48, 57, 44, 50, 32, 28, 18], Raiz: [53, 60, 52, 19, 39, 41, 58, 38, 54],
};
const PORTAO_CENTRO: Record<number, string> = {};
for (const [c, gs] of Object.entries(CENTROS)) for (const g of gs) PORTAO_CENTRO[g] = c;
const NOMES_CENTROS: Record<string, string> = {
  Cabeca: "Coronário", Ajna: "Ajna", Garganta: "Laríngeo", G: "Centro G", Coracao: "Ego",
  Sacral: "Sacral", PlexoSolar: "Plexo Solar", Baco: "Esplênico", Raiz: "Raiz",
};
const MOTORES = ["Sacral", "Raiz", "PlexoSolar", "Coracao"];
const CANAIS: [number, number][] = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15], [6, 59], [7, 31], [9, 52],
  [10, 20], [10, 34], [10, 57], [11, 56], [12, 22], [13, 33], [16, 48], [17, 62],
  [18, 58], [19, 49], [20, 34], [20, 57], [21, 45], [23, 43], [24, 61], [25, 51],
  [26, 44], [27, 50], [28, 38], [29, 46], [30, 41], [32, 54], [34, 57], [35, 36],
  [37, 40], [39, 55], [42, 53], [47, 64],
];
const CORPOS_HD = ["Sol", "Terra", "NodoNorte", "NodoSul", "Lua", "Mercurio", "Venus", "Marte", "Jupiter", "Saturno", "Urano", "Netuno", "Plutao"];

// Tipo / Estratégia / Autoridade / Perfil / Centros — mesma lógica do motor.mjs
// (Cruz de Encarnação, Quarters, Variáveis PHS e Gene Keys ficam fora daqui:
// não são usados pela Bússola nem pelo panorama revelado no Portal 0.)
function desenhoHumano(posPers: Record<string, number>, posDes: Record<string, number>) {
  const ativacoes: Record<string, Record<string, { portao: number; linha: number; lon: number }>> = { personalidade: {}, design: {} };
  for (const c of CORPOS_HD) {
    ativacoes.personalidade[c] = { ...portaoDe(posPers[c]), lon: posPers[c] };
    ativacoes.design[c] = { ...portaoDe(posDes[c]), lon: posDes[c] };
  }
  const portoes = new Set<number>();
  for (const lado of ["personalidade", "design"] as const)
    for (const c of CORPOS_HD) portoes.add(ativacoes[lado][c].portao);

  const canaisAtivos = CANAIS.filter(([a, b]) => portoes.has(a) && portoes.has(b));
  const definidos = new Set<string>();
  for (const [a, b] of canaisAtivos) { definidos.add(PORTAO_CENTRO[a]); definidos.add(PORTAO_CENTRO[b]); }

  const adj: Record<string, Set<string>> = {};
  for (const [a, b] of canaisAtivos) {
    const ca = PORTAO_CENTRO[a], cb = PORTAO_CENTRO[b];
    (adj[ca] ||= new Set()).add(cb); (adj[cb] ||= new Set()).add(ca);
  }
  const visto = new Set<string>(); let grupos = 0;
  for (const c of definidos) {
    if (visto.has(c)) continue;
    grupos++; const fila = [c];
    while (fila.length) { const x = fila.pop()!; if (visto.has(x)) continue; visto.add(x); for (const y of (adj[x] || [])) if (!visto.has(y)) fila.push(y); }
  }
  const DEFINICAO = ["Nenhuma (Refletor)", "Definição Única", "Split (Dupla)", "Split Triplo", "Split Quádruplo"];

  function conectado(origem: string, destino: string) {
    if (!definidos.has(origem) || !definidos.has(destino)) return false;
    const fila = [origem], vis = new Set<string>();
    while (fila.length) {
      const x = fila.pop()!; if (x === destino) return true;
      if (vis.has(x)) continue; vis.add(x);
      for (const y of (adj[x] || [])) if (!vis.has(y)) fila.push(y);
    }
    return false;
  }
  const motorNaGarganta = MOTORES.some((m) => conectado(m, "Garganta"));
  const sacralDef = definidos.has("Sacral");

  let tipo: string;
  if (definidos.size === 0) tipo = "Refletor";
  else if (sacralDef) tipo = motorNaGarganta ? "Gerador Manifestante" : "Gerador";
  else if (motorNaGarganta) tipo = "Manifestador";
  else tipo = "Projetor";

  let autoridade: string;
  if (tipo === "Refletor") autoridade = "Lunar (ciclo de 28 dias)";
  else if (definidos.has("PlexoSolar")) autoridade = "Emocional — Plexo Solar";
  else if (sacralDef) autoridade = "Sacral";
  else if (definidos.has("Baco")) autoridade = "Esplênica";
  else if (definidos.has("Coracao")) autoridade = conectado("Coracao", "Garganta") ? "Ego Manifestado" : "Ego Projetado";
  else if (definidos.has("G")) autoridade = "Auto-Projetada (Centro G)";
  else autoridade = "Mental / Ambiental (autoridade externa)";

  const estrategia = ({
    Gerador: "Esperar para responder",
    "Gerador Manifestante": "Esperar para responder, depois informar",
    Manifestador: "Informar antes de agir",
    Projetor: "Esperar o convite",
    Refletor: "Esperar um ciclo lunar completo",
  } as Record<string, string>)[tipo];

  const lp = ativacoes.personalidade.Sol.linha, ld = ativacoes.design.Sol.linha;
  const perfil = `${lp}/${ld}`;
  const NOME_LINHA: Record<number, string> = { 1: "Investigador", 2: "Ermitão", 3: "Mártir", 4: "Oportunista", 5: "Herege", 6: "Modelo" };

  return {
    tipo, estrategia, autoridade, perfil,
    perfilNome: `${NOME_LINHA[lp]} / ${NOME_LINHA[ld]}`,
    definicao: DEFINICAO[Math.min(grupos, 4)],
    centrosDefinidos: [...definidos].sort(),
    centrosAbertos: Object.keys(CENTROS).filter((c) => !definidos.has(c)),
    nomesCentros: NOMES_CENTROS,
    canaisAtivos: canaisAtivos.map(([a, b]) => ({ portoes: [a, b] as [number, number] })),
    ativacoes,
  };
}

async function calcularEGravar(supabase: any, jogador: any) {
  const [ano, mes, dia] = String(jogador.data_nascimento).split("-").map(Number);
  let hora = 12, minuto = 0, precisao = "hora_desconhecida";
  if (jogador.hora_nascimento && !jogador.hora_incerta) {
    const [h, m] = String(jogador.hora_nascimento).split(":").map(Number);
    hora = h; minuto = m; precisao = "hora_conhecida";
  } else if (jogador.hora_nascimento && jogador.hora_incerta) {
    const [h, m] = String(jogador.hora_nascimento).split(":").map(Number);
    hora = h; minuto = m; precisao = "hora_aproximada";
  }
  const tz = jogador.timezone || "America/Sao_Paulo";

  const utcNatal = localParaUTC({ ano, mes, dia, hora, minuto, tz });
  const posPers = posicoes(utcNatal);
  const utcDesign = dataDesign(utcNatal);
  const posDes = posicoes(utcDesign);
  const mapa = desenhoHumano(posPers, posDes);

  const autorretrato = {
    ...mapa,
    revealed_to_player: ["tipo", "estrategia", "autoridade", "perfil", "centrosDefinidos"],
    precisao,
    engine: "astronomy-engine",
    calculado_em: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("players")
    .update({ autorretrato_json: autorretrato, autorretrato_em: new Date().toISOString() })
    .eq("player_id", jogador.player_id);
  if (error) throw error;
  return { player_id: jogador.player_id, tipo: mapa.tipo, autoridade: mapa.autoridade, perfil: mapa.perfil, precisao };
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const modo = body.player_id ? "um" : "backfill";

    let query = supabase
      .from("players")
      .select("player_id, data_nascimento, hora_nascimento, hora_incerta, timezone, autorretrato_json")
      .not("data_nascimento", "is", null);
    if (modo === "um") query = query.eq("player_id", body.player_id);
    else query = query.is("autorretrato_json", null);

    const { data: jogadores, error: e0 } = await query;
    if (e0) throw e0;

    // Guarda-chuva de segurança: o app rpgojc (Portal/Etapa 6) também escreve
    // em autorretrato_json, com um payload muito mais rico (psicometria,
    // narrativa, cruz completa) sob a chave "mapa". Essa função NUNCA pode
    // substituir esse payload por um mais simples — só preenche quando o
    // campo está vazio, ou quando já é o formato simples gerado por ela mesma.
    const ehMeuFormatoOuVazio = (j: any) => {
      const a = j.autorretrato_json;
      if (a == null) return true;
      return typeof a === "object" && "tipo" in a && !("mapa" in a);
    };

    const resultados = [];
    const erros = [];
    const ignorados = [];
    for (const j of jogadores || []) {
      if (!ehMeuFormatoOuVazio(j)) { ignorados.push({ player_id: j.player_id, motivo: "autorretrato_json já tem o formato rico do rpgojc (chave 'mapa') — não sobrescrito" }); continue; }
      try { resultados.push(await calcularEGravar(supabase, j)); }
      catch (e) { erros.push({ player_id: j.player_id, erro: String(e) }); }
    }

    return new Response(JSON.stringify({ ok: true, calculados: resultados.length, resultados, ignorados, erros }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (erro) {
    console.error(erro);
    return new Response(JSON.stringify({ ok: false, error: String(erro) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
