// ============================================================
// O JOGO DA VIDA — Motor de Oráculos (núcleo)
// Roda em Node, Deno (Edge Function) e navegador.
// Única dependência: astronomy-engine (MIT, sem arquivos externos, sem rede).
// ============================================================
import * as Astro from 'astronomy-engine';
import {
  RODA_PORTOES, INICIO_RODA, PORTAO_CENTRO, CENTROS, MOTORES, CANAIS,
  CORPOS_HD, ESFERAS_GENE_KEYS, SELOS, CORES_SELO, TONS, ARCANOS,
  TABELAS_NUMEROLOGIA, SIGNOS,
  NOMES_CANAIS, NOMES_CENTROS, ASSINATURA_TEMA, VARIAVEIS, SENTIDOS,
  SENTIDO_SUPERPODER, CRUZES, QUARTERS, ORDEM_QUARTERS, GEOMETRIA_CRUZ
} from './tabelas.mjs';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const norm360 = x => ((x % 360) + 360) % 360;

// ------------------------------------------------------------
// 1. FUSO HORÁRIO — hora local de nascimento → instante UTC
//    Usa a base IANA embutida no runtime (tzdata, domínio público).
// ------------------------------------------------------------
function offsetMs(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = {};
  for (const { type, value } of dtf.formatToParts(date)) p[type] = value;
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUTC - date.getTime();
}
export function localParaUTC({ ano, mes, dia, hora = 12, minuto = 0, tz }) {
  const alvo = Date.UTC(ano, mes - 1, dia, hora, minuto, 0);
  let ms = alvo;
  for (let i = 0; i < 4; i++) ms = alvo - offsetMs(new Date(ms), tz);
  return new Date(ms);
}

// ------------------------------------------------------------
// 2. EFEMÉRIDE — longitudes eclípticas TROPICAIS (eclíptica da data)
// ------------------------------------------------------------
const CORPOS_ASTRO = {
  Sol: Astro.Body.Sun, Lua: Astro.Body.Moon, Mercurio: Astro.Body.Mercury,
  Venus: Astro.Body.Venus, Marte: Astro.Body.Mars, Jupiter: Astro.Body.Jupiter,
  Saturno: Astro.Body.Saturn, Urano: Astro.Body.Uranus, Netuno: Astro.Body.Neptune,
  Plutao: Astro.Body.Pluto
};

function eqjParaEclipticaDaData(vec, time) {
  const rot = Astro.Rotation_EQJ_ECT(time);            // precessão + nutação
  const v = Astro.RotateVector(rot, vec);
  const lon = norm360(Math.atan2(v.y, v.x) * R2D);
  const lat = Math.atan2(v.z, Math.hypot(v.x, v.y)) * R2D;
  return { lon, lat };
}

function nodoLunarVerdadeiro(time) {
  // Nodo = interseção do plano orbital instantâneo da Lua com a eclíptica.
  // h = r × v (momento angular); o nodo ascendente aponta para ẑ × h.
  const dt = 1 / 1440; // 1 minuto, em dias
  const t1 = time.AddDays(-dt), t2 = time.AddDays(dt);
  const p1 = Astro.GeoMoon(t1), p2 = Astro.GeoMoon(t2), p0 = Astro.GeoMoon(time);
  const e0 = eqjParaEclipticaVec(p0, time);
  const e1 = eqjParaEclipticaVec(p1, time);
  const e2 = eqjParaEclipticaVec(p2, time);
  const v = { x: (e2.x - e1.x) / (2 * dt), y: (e2.y - e1.y) / (2 * dt), z: (e2.z - e1.z) / (2 * dt) };
  const h = {
    x: e0.y * v.z - e0.z * v.y,
    y: e0.z * v.x - e0.x * v.z,
    z: e0.x * v.y - e0.y * v.x
  };
  // n = ẑ × h  →  (-h.y, h.x, 0)
  return norm360(Math.atan2(h.x, -h.y) * R2D);
}
function eqjParaEclipticaVec(vec, time) {
  const rot = Astro.Rotation_EQJ_ECT(time);
  return Astro.RotateVector(rot, vec);
}

export function posicoes(dataUTC) {
  const time = Astro.MakeTime(dataUTC);
  const out = {};
  for (const [nome, body] of Object.entries(CORPOS_ASTRO)) {
    const vec = Astro.GeoVector(body, time, true); // true = corrigido de aberração
    out[nome] = eqjParaEclipticaDaData(vec, time).lon;
  }
  out.Terra = norm360(out.Sol + 180);
  out.NodoNorte = nodoLunarVerdadeiro(time);
  out.NodoSul = norm360(out.NodoNorte + 180);
  return out;
}

// ------------------------------------------------------------
// 3. DATA DE DESIGN — instante em que o Sol esteve 88° antes
// ------------------------------------------------------------
export function dataDesign(dataUTC) {
  const t0 = Astro.MakeTime(dataUTC);
  const solNatal = eqjParaEclipticaDaData(Astro.GeoVector(Astro.Body.Sun, t0, true), t0).lon;
  const alvo = norm360(solNatal - 88);
  const f = (dias) => {
    const t = t0.AddDays(dias);
    const l = eqjParaEclipticaDaData(Astro.GeoVector(Astro.Body.Sun, t, true), t).lon;
    let d = norm360(l - alvo);
    if (d > 180) d -= 360;
    return d;
  };
  let lo = -95, hi = -80;                    // ~88 dias antes (Sol ~0.9856°/dia)
  let flo = f(lo), fhi = f(hi);
  if (flo * fhi > 0) { lo = -100; hi = -75; flo = f(lo); fhi = f(hi); }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2, fm = f(mid);
    if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
  }
  return new Date(t0.AddDays((lo + hi) / 2).date.getTime());
}

// ------------------------------------------------------------
// 4. PORTÃO / LINHA / COR / TOM / BASE
// ------------------------------------------------------------
const ARCO_PORTAO = 360 / 64;       // 5.625°
export function portaoDe(lonGrau) {
  const rel = norm360(lonGrau - INICIO_RODA);
  const idx = Math.floor(rel / ARCO_PORTAO);
  const dentro = rel - idx * ARCO_PORTAO;
  const linha = Math.floor(dentro / (ARCO_PORTAO / 6)) + 1;
  const resto1 = dentro % (ARCO_PORTAO / 6);
  const cor = Math.floor(resto1 / (ARCO_PORTAO / 36)) + 1;
  const resto2 = resto1 % (ARCO_PORTAO / 36);
  const tom = Math.floor(resto2 / (ARCO_PORTAO / 216)) + 1;
  const resto3 = resto2 % (ARCO_PORTAO / 216);
  const base = Math.floor(resto3 / (ARCO_PORTAO / 1080)) + 1;
  return { portao: RODA_PORTOES[idx], linha, cor, tom, base };
}
export function signoDe(lon) {
  const i = Math.floor(norm360(lon) / 30);
  const g = norm360(lon) - i * 30;
  return { signo: SIGNOS[i], grau: Math.floor(g), minuto: Math.floor((g % 1) * 60), lon: norm360(lon) };
}

// ------------------------------------------------------------
// 5. CASAS — Ascendente, MC, cúspides (Placidus + Signo Inteiro)
// ------------------------------------------------------------
function obliquidade(time) {
  const r = Astro.Rotation_ECT_EQD(time);       // matriz eclíptica→equador da data
  return Math.acos(Math.max(-1, Math.min(1, r.rot[1][1]))) * R2D;
}
export function casas(dataUTC, latitude, longitude, sistema = 'placidus') {
  const time = Astro.MakeTime(dataUTC);
  const eps = obliquidade(time) * D2R;
  const lat = latitude * D2R;
  const gst = Astro.SiderealTime(time);                  // horas
  const ramc = norm360(gst * 15 + longitude);            // RA do MC, graus
  const R = ramc * D2R;

  const mc = norm360(Math.atan2(Math.sin(R), Math.cos(R) * Math.cos(eps)) * R2D);
  const asc = norm360(Math.atan2(Math.cos(R), -(Math.sin(R) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))) * R2D);

  const raParaLon = ra => norm360(Math.atan2(Math.sin(ra * D2R), Math.cos(ra * D2R) * Math.cos(eps)) * R2D);
  function placidus(offsetFn) {
    let ra = ramc + offsetFn(0);
    for (let i = 0; i < 60; i++) {
      const lam = raParaLon(ra) * D2R;
      const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
      let x = Math.tan(lat) * Math.tan(dec);
      x = Math.max(-1, Math.min(1, x));
      const ad = Math.asin(x) * R2D;
      const nova = ramc + offsetFn(ad);
      if (Math.abs(nova - ra) < 1e-10) { ra = nova; break; }
      ra = nova;
    }
    return raParaLon(ra);
  }
  let cusps;
  if (sistema === 'signo-inteiro') {
    const base = Math.floor(asc / 30) * 30;
    cusps = Array.from({ length: 12 }, (_, i) => norm360(base + i * 30));
  } else {
    const c11 = placidus(ad => (90 + ad) / 3);
    const c12 = placidus(ad => 2 * (90 + ad) / 3);
    const c2 = placidus(ad => 90 + ad + (90 - ad) / 3);
    const c3 = placidus(ad => 90 + ad + 2 * (90 - ad) / 3);
    cusps = [asc, c2, c3, norm360(mc + 180), norm360(c11 + 180), norm360(c12 + 180),
             norm360(asc + 180), norm360(c2 + 180), norm360(c3 + 180), mc, c11, c12];
  }
  return { asc, mc, cusps, ramc, obliquidade: eps * R2D };
}
export function casaDe(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const larg = norm360(b - a), pos = norm360(lon - a);
    if (pos < larg) return i + 1;
  }
  return 1;
}

// Distância angular (em minutos de arco) até a cúspide mais próxima, e qual é ela.
// ORBE_SOLEIRA: dentro disso, afirmar UMA casa é fingir precisão que o dado não tem.
export const ORBE_SOLEIRA = 1.0; // graus
export function posicaoNaCasa(lon, cusps) {
  const casa = casaDe(lon, cusps);
  let melhor = Infinity, idx = 0;
  for (let i = 0; i < 12; i++) {
    let d = Math.abs(norm360(lon - cusps[i]));
    if (d > 180) d = 360 - d;
    if (d < melhor) { melhor = d; idx = i; }
  }
  const naSoleira = melhor < ORBE_SOLEIRA;
  const casaVizinha = idx + 1;
  return {
    casa,
    naSoleira,
    minutosDaCuspide: +(melhor * 60).toFixed(1),
    cuspideProxima: casaVizinha,
    // as duas casas em jogo, em ordem
    entre: naSoleira
      ? [casa, casa === casaVizinha ? (casa === 1 ? 12 : casa - 1) : casaVizinha].sort((a, b) => {
          const d = (x) => norm360(cusps[x - 1] - cusps[0]); return d(a) - d(b);
        })
      : null
  };
}

// ------------------------------------------------------------
// 6. DESENHO HUMANO — tipo, autoridade, perfil, definição, cruz
// ------------------------------------------------------------
export function desenhoHumano(posPers, posDes) {
  const ativacoes = { personalidade: {}, design: {} };
  for (const c of CORPOS_HD) {
    ativacoes.personalidade[c] = { ...portaoDe(posPers[c]), lon: posPers[c] };
    ativacoes.design[c] = { ...portaoDe(posDes[c]), lon: posDes[c] };
  }
  const portoes = new Set();
  for (const lado of ['personalidade', 'design'])
    for (const c of CORPOS_HD) portoes.add(ativacoes[lado][c].portao);

  const canaisAtivos = CANAIS.filter(([a, b]) => portoes.has(a) && portoes.has(b));
  const definidos = new Set();
  for (const [a, b] of canaisAtivos) { definidos.add(PORTAO_CENTRO[a]); definidos.add(PORTAO_CENTRO[b]); }

  // grafo de centros conectados por canais
  const adj = {};
  for (const [a, b] of canaisAtivos) {
    const ca = PORTAO_CENTRO[a], cb = PORTAO_CENTRO[b];
    (adj[ca] ||= new Set()).add(cb); (adj[cb] ||= new Set()).add(ca);
  }
  const visto = new Set(); let grupos = 0;
  for (const c of definidos) {
    if (visto.has(c)) continue;
    grupos++; const fila = [c];
    while (fila.length) { const x = fila.pop(); if (visto.has(x)) continue; visto.add(x); for (const y of (adj[x] || [])) if (!visto.has(y)) fila.push(y); }
  }
  const DEFINICAO = ['Nenhuma (Refletor)', 'Definição Única', 'Split (Dupla)', 'Split Triplo', 'Split Quádruplo'];

  // motor conectado à garganta?
  function conectado(origem, destino) {
    if (!definidos.has(origem) || !definidos.has(destino)) return false;
    const fila = [origem], vis = new Set();
    while (fila.length) {
      const x = fila.pop(); if (x === destino) return true;
      if (vis.has(x)) continue; vis.add(x);
      for (const y of (adj[x] || [])) if (!vis.has(y)) fila.push(y);
    }
    return false;
  }
  const motorNaGarganta = MOTORES.some(m => conectado(m, 'Garganta'));
  const sacralDef = definidos.has('Sacral');

  let tipo;
  if (definidos.size === 0) tipo = 'Refletor';
  else if (sacralDef) tipo = motorNaGarganta ? 'Gerador Manifestante' : 'Gerador';
  else if (motorNaGarganta) tipo = 'Manifestador';
  else tipo = 'Projetor';

  let autoridade;
  if (tipo === 'Refletor') autoridade = 'Lunar (ciclo de 28 dias)';
  else if (definidos.has('PlexoSolar')) autoridade = 'Emocional — Plexo Solar';
  else if (sacralDef) autoridade = 'Sacral';
  else if (definidos.has('Baco')) autoridade = 'Esplênica';
  else if (definidos.has('Coracao')) autoridade = conectado('Coracao', 'Garganta') ? 'Ego Manifestado' : 'Ego Projetado';
  else if (definidos.has('G')) autoridade = 'Auto-Projetada (Centro G)';
  else autoridade = 'Mental / Ambiental (autoridade externa)';

  const estrategia = {
    'Gerador': 'Esperar para responder',
    'Gerador Manifestante': 'Esperar para responder, depois informar',
    'Manifestador': 'Informar antes de agir',
    'Projetor': 'Esperar o convite',
    'Refletor': 'Esperar um ciclo lunar completo'
  }[tipo];

  const lp = ativacoes.personalidade.Sol.linha, ld = ativacoes.design.Sol.linha;
  const perfil = `${lp}/${ld}`;
  const NOME_LINHA = { 1: 'Investigador', 2: 'Ermitão', 3: 'Mártir', 4: 'Oportunista', 5: 'Herege', 6: 'Modelo' };

  // Ângulo da Cruz: definido pelo perfil. Direito = 1/3,1/4,2/4,2/5,3/5,3/6,4/6;
  // Justaposição = 4/1; Esquerdo = 5/1,5/2,6/2,6/3.
  const ANGULO_POR_PERFIL = {
    '1/3':'Ângulo Direito','1/4':'Ângulo Direito','2/4':'Ângulo Direito','2/5':'Ângulo Direito',
    '3/5':'Ângulo Direito','3/6':'Ângulo Direito','4/6':'Ângulo Direito',
    '4/1':'Justaposição',
    '5/1':'Ângulo Esquerdo','5/2':'Ângulo Esquerdo','6/2':'Ângulo Esquerdo','6/3':'Ângulo Esquerdo'
  };
  const angulo = ANGULO_POR_PERFIL[`${lp}/${ld}`] || 'Ângulo Direito';
  const gsolP = ativacoes.personalidade.Sol.portao, gterraP = ativacoes.personalidade.Terra.portao;
  const gsolD = ativacoes.design.Sol.portao,        gterraD = ativacoes.design.Terra.portao;
  const chaveCruz = angulo.toUpperCase() + '|' + gsolP;
  const nomeCruz = CRUZES[chaveCruz] || null;
  const notacao = `${gsolP}/${gterraP} | ${gsolD}/${gterraD}`;
  // Quarter: determinado pela posição do Sol da Personalidade na roda a partir do 13
  const idxQ = ORDEM_QUARTERS.indexOf(gsolP);
  const quarter = idxQ >= 0 ? QUARTERS[Math.floor(idxQ / 16)] : null;
  const geo = GEOMETRIA_CRUZ[angulo] || {};

  const cruz = {
    solP: gsolP, terraP: gterraP, solD: gsolD, terraD: gterraD,
    angulo,
    nome: nomeCruz,
    notacao,
    // "Ângulo Direito da Cruz do Éden (6/36 | 12/11)" quando o nome é conhecido;
    // sem o nome, entrega o que é verificável: ângulo + os quatro portões.
    completo: nomeCruz ? `${angulo} da ${nomeCruz} (${notacao})` : `${angulo} (${notacao})`,
    nomePendente: !nomeCruz,
    destino: geo.destino || null,
    geometriaTexto: geo.texto || null,
    quarter: quarter ? {
      nome: quarter.nome, reino: quarter.reino, faixa: quarter.porta,
      tema: quarter.tema, mistico: quarter.mistico, texto: quarter.texto
    } : null
  };

  // --- As quatro Variáveis, derivadas da cor; o sentido, do tom ---
  const variaveis = {};
  for (const [chave, v] of Object.entries(VARIAVEIS)) {
    const g = ativacoes[v.lado][v.fonte];
    const par = v.variantes[g.cor - 1] || ['', ''];
    variaveis[chave] = {
      rotulo: v.rotulo,
      valor: v.cores[g.cor - 1],
      variante: g.tom <= 3 ? par[0] : par[1],
      completo: v.cores[g.cor - 1] + (par[g.tom <= 3 ? 0 : 1] ? ' — ' + par[g.tom <= 3 ? 0 : 1] : ''),
      origem: `${v.fonte} ${v.lado === 'design' ? 'Design' : 'Personalidade'} ${g.portao}.${g.linha}`,
      cor: g.cor, tom: g.tom, base: g.base
    };
  }
  const tomDigestao = ativacoes.design.Sol.tom;
  const sentido = SENTIDOS[tomDigestao - 1];
  variaveis.sentido = {
    rotulo: 'Sentido mais forte', valor: sentido,
    superpoder: SENTIDO_SUPERPODER[sentido] || '',
    completo: sentido + (SENTIDO_SUPERPODER[sentido] ? ' — ' + SENTIDO_SUPERPODER[sentido] : ''),
    origem: `tom do Sol Design (${tomDigestao})`
  };

  const at = ASSINATURA_TEMA[tipo] || {};
  return {
    tipo, estrategia, autoridade, perfil,
    perfilNome: `${NOME_LINHA[lp]} / ${NOME_LINHA[ld]}`,
    assinaturaEnergetica: at.assinatura || null,
    temaEmocional: at.tema || null,
    definicao: DEFINICAO[Math.min(grupos, 4)],
    centrosDefinidos: [...definidos].sort(),
    centrosAbertos: Object.keys(CENTROS).filter(c => !definidos.has(c)),
    nomesCentros: NOMES_CENTROS,
    canais: canaisAtivos.map(c => c.join('-')),
    canaisNomeados: canaisAtivos.map(c => {
      const k = c.slice().sort((a, b) => a - b).join('-');
      return { canal: c.join('-'), chave: k, nome: NOMES_CANAIS[k] || null };
    }),
    portoes: [...portoes].sort((a, b) => a - b),
    cruzEncarnacao: cruz,
    variaveis,
    ativacoes
  };
}

// ------------------------------------------------------------
// 7. GENE KEYS — Perfil Hologenético
// ------------------------------------------------------------
export function geneKeys(posPers, posDes) {
  return ESFERAS_GENE_KEYS.map(([nome, corpo, lado, seq]) => {
    const lon = lado === 'P' ? posPers[corpo] : posDes[corpo];
    const g = portaoDe(lon);
    return { esfera: nome, sequencia: seq, corpo, lado: lado === 'P' ? 'Personalidade' : 'Design',
             chave: g.portao, linha: g.linha };
  });
}

// ------------------------------------------------------------
// 8. KIN MAIA (Dreamspell) — 26/07/1987 = Kin 1; 29/02 é dia nulo
// ------------------------------------------------------------
export function kinMaia(ano, mes, dia) {
  const diasAte = (y, m, d) => {          // dias desde 1600-01-01 ignorando todo 29/02
    let n = 0;
    for (let a = 1600; a < y; a++) n += 365;
    const ml = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    for (let i = 0; i < m - 1; i++) n += ml[i];
    n += (m === 2 && d === 29) ? 27 : d - 1;   // 29/02 = dia nulo: herda o Kin de 28/02
    return n;
  };
  const base = diasAte(1987, 7, 26) - 33;   // 26/07/1987 = Kin 34 (Mago Galáctico Branco)
  const alvo = diasAte(ano, mes, dia);
  const kin = ((alvo - base) % 260 + 260) % 260 + 1;
  const selo = (kin - 1) % 20;
  const tom = (kin - 1) % 13;
  return {
    kin,
    selo: SELOS[selo],
    cor: CORES_SELO[selo % 4],
    tom: TONS[tom],
    numeroTom: tom + 1,
    assinatura: `Kin ${kin} — ${CORES_SELO[selo % 4]} ${TONS[tom]} ${SELOS[selo]}`
  };
}

// ------------------------------------------------------------
// 9. NUMEROLOGIA (tabela configurável)
// ------------------------------------------------------------
const semAcento = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
const reduzir = (n, mestres = [11, 22, 33]) => {
  while (n > 9 && !mestres.includes(n)) n = String(n).split('').reduce((a, c) => a + +c, 0);
  return n;
};
const VOGAIS = new Set(['A', 'E', 'I', 'O', 'U']);
export function numerologia(nomeCompleto, ano, mes, dia, tabela = 'cabalistica_hebraica') {
  const T = TABELAS_NUMEROLOGIA[tabela].valores;
  const letras = semAcento(nomeCompleto);
  const soma = ls => ls.split('').reduce((a, c) => a + (T[c] || 0), 0);
  const expressao = soma(letras);
  const motivacao = soma(letras.split('').filter(c => VOGAIS.has(c)).join(''));
  const impressao = soma(letras.split('').filter(c => !VOGAIS.has(c)).join(''));
  const somaData = String(ano).split('').concat(String(mes).padStart(2, '0').split(''), String(dia).padStart(2, '0').split(''))
    .reduce((a, c) => a + +c, 0);
  return {
    tabela: TABELAS_NUMEROLOGIA[tabela].rotulo,
    nomeUsado: nomeCompleto,
    expressao: { bruto: expressao, reduzido: reduzir(expressao) },
    motivacao: { bruto: motivacao, reduzido: reduzir(motivacao) },
    impressao: { bruto: impressao, reduzido: reduzir(impressao) },
    caminhoDeVida: { bruto: somaData, reduzido: reduzir(somaData) },
    diaNatalicio: reduzir(dia)
  };
}

// ------------------------------------------------------------
// 10. ARCANO DO TARÔ MITOLÓGICO (a partir da data de nascimento)
// ------------------------------------------------------------
export function arcanoTaro(ano, mes, dia) {
  let s = dia + mes + String(ano).split('').reduce((a, c) => a + +c, 0);
  while (s > 22) s = String(s).split('').reduce((a, c) => a + +c, 0);
  const idx = s === 22 ? 0 : s;                 // 22 → O Louco (0)
  const [n, nome, deus] = ARCANOS[idx];
  // arcano-sombra: a segunda redução (carta de trabalho)
  let s2 = s; while (s2 > 9) s2 = String(s2).split('').reduce((a, c) => a + +c, 0);
  const [n2, nome2, deus2] = ARCANOS[s2];
  return { numero: n, arcano: nome, deus, sombraNumero: n2, sombraArcano: nome2, sombraDeus: deus2, somaBruta: s };
}

// ------------------------------------------------------------
// 11. ORQUESTRADOR
// ------------------------------------------------------------
export function mapaCompleto({ nome, ano, mes, dia, hora = 12, minuto = 0, tz, lat, lon, sistemaCasas = 'placidus', tabelaNumerologia = 'cabalistica_hebraica' }) {
  const utc = localParaUTC({ ano, mes, dia, hora, minuto, tz });
  const utcDesign = dataDesign(utc);
  const posP = posicoes(utc);
  const posD = posicoes(utcDesign);
  const c = casas(utc, lat, lon, sistemaCasas);

  const astral = {
    ascendente: signoDe(c.asc), meioDoCeu: signoDe(c.mc),
    sistemaCasas: sistemaCasas,
    cuspides: c.cusps.map((x, i) => ({ casa: i + 1, ...signoDe(x) })),
    planetas: Object.fromEntries(Object.entries(posP)
      .filter(([k]) => k !== 'Terra')
      .map(([k, v]) => [k, { ...signoDe(v), ...posicaoNaCasa(v, c.cusps) }]))
  };
  const ascG = portaoDe(c.asc);

  return {
    entrada: { nome, nascimento: `${String(dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}/${ano} ${String(hora).padStart(2,'0')}:${String(minuto).padStart(2,'0')}`, tz, lat, lon },
    utcNascimento: utc.toISOString(),
    utcDesign: utcDesign.toISOString(),
    astral,
    desenhoHumano: { ...desenhoHumano(posP, posD), portaoAscendente: ascG },
    geneKeys: geneKeys(posP, posD),
    kin: kinMaia(ano, mes, dia),
    numerologia: numerologia(nome, ano, mes, dia, tabelaNumerologia),
    taro: arcanoTaro(ano, mes, dia)
  };
}
