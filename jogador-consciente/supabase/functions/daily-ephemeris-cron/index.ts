// imersao_daily_ephemeris — Camada 1 (Efeméride) da Bússola Diária do Jogador.
// Calcula, uma única vez por dia, a posição real dos corpos celestes (a mesma
// para todos os jogadores do planeta) e grava o resultado em cache.
// Determinístico: nenhuma chamada de IA aqui, só astronomy-engine (puro JS,
// compatível com Deno — swisseph é binding nativo e NÃO roda em Edge Function).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as Astro from "npm:astronomy-engine@2";

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const norm360 = (x: number) => ((x % 360) + 360) % 360;

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
  const lat = Math.atan2(v.z, Math.hypot(v.x, v.y)) * R2D;
  return { lon, lat };
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

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const agora = new Date();
    const dia = agora.toISOString().slice(0, 10); // data UTC do cálculo

    const pos = posicoes(agora);
    const corpos: Record<string, { lon: number; portao: number; linha: number }> = {};
    const gatesAtivos = new Set<number>();
    for (const [nome, lon] of Object.entries(pos)) {
      const { portao, linha } = portaoDe(lon);
      corpos[nome] = { lon: Number(lon.toFixed(4)), portao, linha };
      gatesAtivos.add(portao);
    }

    const { error } = await supabase
      .from("imersao_daily_ephemeris")
      .upsert({
        dia,
        corpos,
        gates_ativos: Array.from(gatesAtivos).sort((a, b) => a - b),
        engine: "astronomy-engine",
        calculado_em: agora.toISOString(),
      }, { onConflict: "dia" });

    if (error) throw error;

    return new Response(JSON.stringify({ ok: true, dia, gates_ativos: Array.from(gatesAtivos) }), {
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
