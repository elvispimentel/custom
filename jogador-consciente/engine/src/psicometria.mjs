// ============================================================
// O JOGO DA VIDA — Camada psicométrica
// Um único inventário (IPIP-50, domínio público) gera três oráculos:
// Big Five, tipologia de 4 letras e temperamento.
// Eneagrama usa banco autoral próprio (36 itens) — sem licença de terceiro.
// ============================================================

// ---------- IPIP-50 (Goldberg Big-Five Factor Markers) -------
// Itens em domínio público (ipip.ori.org). Tradução PT-BR autoral.
// f: fator | s: sentido (+1 direto, -1 invertido)
export const IPIP50 = [
  {id:1, f:'E', s:+1, t:'Sou a alma da festa.'},
  {id:2, f:'A', s:-1, t:'Me importo pouco com o que os outros sentem.'},
  {id:3, f:'C', s:+1, t:'Estou sempre preparado.'},
  {id:4, f:'N', s:+1, t:'Fico estressado com facilidade.'},
  {id:5, f:'O', s:+1, t:'Tenho um vocabulário rico.'},
  {id:6, f:'E', s:-1, t:'Falo pouco.'},
  {id:7, f:'A', s:+1, t:'Me interesso pelas pessoas.'},
  {id:8, f:'C', s:-1, t:'Deixo minhas coisas espalhadas.'},
  {id:9, f:'N', s:-1, t:'Fico relaxado na maior parte do tempo.'},
  {id:10,f:'O', s:-1, t:'Tenho dificuldade com ideias abstratas.'},
  {id:11,f:'E', s:+1, t:'Me sinto à vontade perto das pessoas.'},
  {id:12,f:'A', s:-1, t:'Ofendo as pessoas.'},
  {id:13,f:'C', s:+1, t:'Presto atenção aos detalhes.'},
  {id:14,f:'N', s:+1, t:'Fico preocupado com as coisas.'},
  {id:15,f:'O', s:+1, t:'Tenho imaginação fértil.'},
  {id:16,f:'E', s:-1, t:'Prefiro ficar em segundo plano.'},
  {id:17,f:'A', s:+1, t:'Me solidarizo com o que os outros sentem.'},
  {id:18,f:'C', s:-1, t:'Faço bagunça das coisas.'},
  {id:19,f:'N', s:-1, t:'Raramente me sinto pra baixo.'},
  {id:20,f:'O', s:-1, t:'Não tenho interesse por ideias abstratas.'},
  {id:21,f:'E', s:+1, t:'Puxo conversa.'},
  {id:22,f:'A', s:-1, t:'Não me interesso pelos problemas dos outros.'},
  {id:23,f:'C', s:+1, t:'Resolvo minhas tarefas logo de cara.'},
  {id:24,f:'N', s:+1, t:'Me abalo com facilidade.'},
  {id:25,f:'O', s:+1, t:'Tenho ideias excelentes.'},
  {id:26,f:'E', s:-1, t:'Tenho pouco a dizer.'},
  {id:27,f:'A', s:+1, t:'Tenho o coração mole.'},
  {id:28,f:'C', s:-1, t:'Costumo esquecer de devolver as coisas ao lugar.'},
  {id:29,f:'N', s:+1, t:'Me irrito com facilidade.'},
  {id:30,f:'O', s:-1, t:'Não tenho boa imaginação.'},
  {id:31,f:'E', s:+1, t:'Converso com muita gente diferente nas festas.'},
  {id:32,f:'A', s:-1, t:'Não me interesso de verdade pelos outros.'},
  {id:33,f:'C', s:+1, t:'Gosto de ordem.'},
  {id:34,f:'N', s:+1, t:'Mudo muito de humor.'},
  {id:35,f:'O', s:+1, t:'Entendo as coisas rapidamente.'},
  {id:36,f:'E', s:-1, t:'Não gosto de chamar atenção para mim.'},
  {id:37,f:'A', s:+1, t:'Reservo tempo para os outros.'},
  {id:38,f:'C', s:-1, t:'Fujo das minhas obrigações.'},
  {id:39,f:'N', s:+1, t:'Tenho oscilações de humor frequentes.'},
  {id:40,f:'O', s:+1, t:'Uso palavras difíceis.'},
  {id:41,f:'E', s:+1, t:'Não me incomodo de ser o centro das atenções.'},
  {id:42,f:'A', s:+1, t:'Sinto as emoções dos outros.'},
  {id:43,f:'C', s:+1, t:'Sigo uma agenda.'},
  {id:44,f:'N', s:+1, t:'Fico irritado facilmente.'},
  {id:45,f:'O', s:+1, t:'Passo tempo refletindo sobre as coisas.'},
  {id:46,f:'E', s:-1, t:'Fico calado perto de desconhecidos.'},
  {id:47,f:'A', s:+1, t:'Deixo as pessoas à vontade.'},
  {id:48,f:'C', s:+1, t:'Sou rigoroso no meu trabalho.'},
  {id:49,f:'N', s:+1, t:'Me sinto pra baixo com frequência.'},
  {id:50,f:'O', s:+1, t:'Sou cheio de ideias.'}
];

export const FATORES = {
  E:'Extroversão', A:'Amabilidade', C:'Conscienciosidade',
  N:'Neuroticismo (instabilidade emocional)', O:'Abertura / Intelecto'
};

// respostas: {id: 1..5}
export function bigFive(respostas) {
  const soma = {E:0,A:0,C:0,N:0,O:0}, n = {E:0,A:0,C:0,N:0,O:0};
  for (const it of IPIP50) {
    const r = respostas[it.id];
    if (r == null) continue;
    soma[it.f] += it.s > 0 ? r : (6 - r);
    n[it.f]++;
  }
  const out = {};
  for (const f of Object.keys(soma)) {
    const bruto = soma[f], max = n[f] * 5, min = n[f] * 1;
    const pct = n[f] ? (bruto - min) / (max - min) * 100 : null;
    out[f] = { fator: FATORES[f], bruto, itens: n[f], percentual: pct == null ? null : +pct.toFixed(1) };
  }
  return out;
}

// ---------- Tipologia de 4 letras derivada do Big Five --------
// Base: McCrae & Costa (1989), Journal of Personality — as quatro
// dicotomias junguianas correlacionam com quatro dos cinco fatores.
export function tipologia4Letras(bf) {
  const p = f => bf[f].percentual;
  const eixo = (v, a, b) => ({ letra: v >= 50 ? a : b, forca: +Math.abs(v - 50).toFixed(1), percentual: v });
  const e = eixo(p('E'), 'E', 'I');
  const s = eixo(p('O'), 'N', 'S');
  const t = eixo(p('A'), 'F', 'T');
  const j = eixo(p('C'), 'J', 'P');
  return {
    tipo: e.letra + s.letra + t.letra + j.letra,
    eixos: {
      'Extroversão / Introversão': e,
      'Intuição / Sensação': s,
      'Sentimento / Pensamento': t,
      'Julgamento / Percepção': j
    },
    nota: 'Derivado das correlações Big Five ↔ dicotomias junguianas (McCrae & Costa, 1989). Não é um instrumento de marca registrada.'
  };
}

// ---------- Temperamento (circumplexo de Eysenck) -------------
// Extroversão × Estabilidade Emocional → os quatro humores clássicos.
export function temperamento(bf) {
  const E = bf.E.percentual, N = bf.N.percentual;
  const alto = v => v >= 50;
  let nome, humor, chave;
  if (alto(E) && !alto(N)) { nome='Sanguíneo'; humor='Ar / sangue'; chave='extrovertido e estável — entusiasmo que precisa de continuidade'; }
  else if (alto(E) && alto(N)) { nome='Colérico'; humor='Fogo / bile amarela'; chave='extrovertido e reativo — força que precisa de direção'; }
  else if (!alto(E) && alto(N)) { nome='Melancólico'; humor='Terra / bile negra'; chave='introvertido e sensível — profundidade que precisa de movimento'; }
  else { nome='Fleumático'; humor='Água / fleuma'; chave='introvertido e estável — constância que precisa de voltagem'; }
  const dist = (a,b) => Math.hypot(E-a, N-b);
  const mistura = [['Sanguíneo',75,25],['Colérico',75,75],['Melancólico',25,75],['Fleumático',25,25]]
    .map(([k,a,b]) => ({ temperamento:k, proximidade:+(100 - dist(a,b)).toFixed(1) }))
    .sort((x,y)=>y.proximidade-x.proximidade);
  return { dominante: nome, humor, leitura: chave, extroversao: E, reatividade: N, mistura };
}

// ---------- Eneagrama — banco autoral (36 itens) --------------
// Escrito para este produto. Nenhum item copiado de instrumento
// proprietário. O sistema (9 tipos) é de domínio comum; os itens são de Elvis.
export const ENEAGRAMA_ITENS = [
  {id:'e1a',tipo:1,t:'Percebo o que está errado antes de perceber o que está certo.'},
  {id:'e1b',tipo:1,t:'Tenho uma voz interna que corrige quase tudo o que eu faço.'},
  {id:'e1c',tipo:1,t:'Me irrito quando as pessoas fazem malfeito o que poderiam fazer direito.'},
  {id:'e1d',tipo:1,t:'Adio prazer até que o dever esteja cumprido.'},
  {id:'e2a',tipo:2,t:'Sei do que as pessoas precisam antes de elas pedirem.'},
  {id:'e2b',tipo:2,t:'Tenho dificuldade de pedir ajuda, mesmo precisando.'},
  {id:'e2c',tipo:2,t:'Meu valor cresce quando sou necessário para alguém.'},
  {id:'e2d',tipo:2,t:'Fico magoado quando faço muito por alguém e não sou reconhecido.'},
  {id:'e3a',tipo:3,t:'Me apresento pela versão de mim que funciona melhor naquele ambiente.'},
  {id:'e3b',tipo:3,t:'Parar de produzir me dá uma sensação ruim, quase de perigo.'},
  {id:'e3c',tipo:3,t:'Meço meu valor pelo que entrego.'},
  {id:'e3d',tipo:3,t:'Evito situações onde eu possa parecer perdedor.'},
  {id:'e4a',tipo:4,t:'Sinto que falta em mim alguma coisa que os outros parecem ter.'},
  {id:'e4b',tipo:4,t:'Prefiro ser autêntico e incompreendido a ser aceito e comum.'},
  {id:'e4c',tipo:4,t:'Minhas emoções têm mais amplitude do que a maioria suporta.'},
  {id:'e4d',tipo:4,t:'O que está distante me parece mais valioso que o que já tenho.'},
  {id:'e5a',tipo:5,t:'Recuo para observar antes de me envolver.'},
  {id:'e5b',tipo:5,t:'Guardo minha energia como quem guarda um recurso escasso.'},
  {id:'e5c',tipo:5,t:'Preciso entender antes de participar.'},
  {id:'e5d',tipo:5,t:'Demandas emocionais me esgotam mais rápido que demandas práticas.'},
  {id:'e6a',tipo:6,t:'Minha cabeça ensaia o que pode dar errado antes de eu agir.'},
  {id:'e6b',tipo:6,t:'Testo as pessoas antes de confiar de verdade.'},
  {id:'e6c',tipo:6,t:'Me sinto mais seguro quando tenho um plano B.'},
  {id:'e6d',tipo:6,t:'Duvido da minha própria decisão logo depois de tomá-la.'},
  {id:'e7a',tipo:7,t:'Já estou planejando a próxima coisa antes de terminar esta.'},
  {id:'e7b',tipo:7,t:'Transformo desconforto em piada ou em novo projeto.'},
  {id:'e7c',tipo:7,t:'Me sinto preso quando só existe uma opção disponível.'},
  {id:'e7d',tipo:7,t:'Prefiro o começo entusiasmado ao meio trabalhoso.'},
  {id:'e8a',tipo:8,t:'Assumo o comando quando percebo que ninguém está assumindo.'},
  {id:'e8b',tipo:8,t:'Prefiro o confronto direto ao clima pesado não dito.'},
  {id:'e8c',tipo:8,t:'Mostrar fragilidade me parece arriscado.'},
  {id:'e8d',tipo:8,t:'Fico incomodado quando alguém abusa de quem tem menos força.'},
  {id:'e9a',tipo:9,t:'Absorvo a opinião do ambiente antes de encontrar a minha.'},
  {id:'e9b',tipo:9,t:'Adio o que é importante fazendo o que é confortável.'},
  {id:'e9c',tipo:9,t:'Evito conflito mesmo quando o conflito resolveria mais rápido.'},
  {id:'e9d',tipo:9,t:'Tenho dificuldade de dizer o que eu quero, de fato, para mim.'}
];
export const ENEAGRAMA_NOMES = {
  1:'O Perfeccionista', 2:'O Prestativo', 3:'O Realizador', 4:'O Individualista',
  5:'O Investigador', 6:'O Leal', 7:'O Entusiasta', 8:'O Desafiador', 9:'O Pacificador'
};
export const ENEAGRAMA_PAIXAO = {
  1:'Ira', 2:'Orgulho', 3:'Vaidade', 4:'Inveja', 5:'Avareza',
  6:'Medo', 7:'Gula', 8:'Luxúria/Excesso', 9:'Preguiça (acídia)'
};
export function eneagrama(respostas) {
  const soma = {}, n = {};
  for (const it of ENEAGRAMA_ITENS) {
    const r = respostas[it.id]; if (r == null) continue;
    soma[it.tipo] = (soma[it.tipo] || 0) + r; n[it.tipo] = (n[it.tipo] || 0) + 1;
  }
  const rank = Object.keys(soma).map(k => ({
    tipo: +k, nome: ENEAGRAMA_NOMES[k], paixao: ENEAGRAMA_PAIXAO[k],
    bruto: soma[k], percentual: +(((soma[k] - n[k]) / (n[k] * 4)) * 100).toFixed(1)
  })).sort((a, b) => b.bruto - a.bruto);
  const p = rank[0]?.tipo;
  const asas = p ? [p === 1 ? 9 : p - 1, p === 9 ? 1 : p + 1] : [];
  const asa = rank.find(r => asas.includes(r.tipo));
  return {
    dominante: rank[0],
    asa: asa ? { tipo: asa.tipo, nome: asa.nome, notacao: `${p}a${asa.tipo}` } : null,
    ranking: rank,
    nota: 'Banco de itens autoral. O sistema dos nove tipos é de domínio comum; nenhum item vem de instrumento licenciado.'
  };
}

export function perfilPsicometrico(respIPIP, respEne) {
  const bf = bigFive(respIPIP);
  return {
    bigFive: bf,
    tipologia: tipologia4Letras(bf),
    temperamento: temperamento(bf),
    eneagrama: respEne ? eneagrama(respEne) : null
  };
}
