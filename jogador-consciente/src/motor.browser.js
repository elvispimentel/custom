/* ==== Motor de Oráculos — O Jogo da Vida ==== */
(function(global){
'use strict';
const Astro = global.Astronomy;

/* ---- src/tabelas.mjs ---- */
// ============================================================
// O JOGO DA VIDA — Motor de Oráculos
// tabelas.mjs — dados canônicos (nenhuma dependência externa)
// ============================================================

// --- Roda de Portões (Rave Mandala) -------------------------
// Portão 41 inicia em 2°00'00" de Aquário = 302.00° eclíptica tropical.
// Cada portão = 360/64 = 5.625°. Cada linha = 0.9375°.
const RODA_PORTOES = [
  41,19,13,49,30,55,37,63,22,36,25,17,21,51,42,3,
  27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,
  31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,
  28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60
];
const INICIO_RODA = 302.0; // grau eclíptico onde o portão 41 começa

// --- Portão → Centro ----------------------------------------
const CENTROS = {
  Cabeca:      [64,61,63],
  Ajna:        [47,24,4,17,43,11],
  Garganta:    [62,23,56,35,12,45,33,8,31,20,16],
  G:           [7,1,13,25,46,2,15,10],
  Coracao:     [21,40,26,51],
  Sacral:      [34,5,14,29,59,9,3,42,27],
  PlexoSolar:  [6,37,22,36,30,55,49],
  Baco:        [48,57,44,50,32,28,18],
  Raiz:        [53,60,52,19,39,41,58,38,54]
};
const PORTAO_CENTRO = (() => {
  const m = {};
  for (const [c, gs] of Object.entries(CENTROS)) for (const g of gs) m[g] = c;
  return m;
})();

const MOTORES = ['Sacral','Raiz','PlexoSolar','Coracao'];

// --- 36 Canais ----------------------------------------------
const CANAIS = [
  [1,8],[2,14],[3,60],[4,63],[5,15],[6,59],[7,31],[9,52],
  [10,20],[10,34],[10,57],[11,56],[12,22],[13,33],[16,48],[17,62],
  [18,58],[19,49],[20,34],[20,57],[21,45],[23,43],[24,61],[25,51],
  [26,44],[27,50],[28,38],[29,46],[30,41],[32,54],[34,57],[35,36],
  [37,40],[39,55],[42,53],[47,64]
];

// --- Corpos usados nas 13 ativações --------------------------
const CORPOS_HD = ['Sol','Terra','NodoNorte','NodoSul','Lua','Mercurio','Venus','Marte','Jupiter','Saturno','Urano','Netuno','Plutao'];

// --- Esferas do Perfil Hologenético (Gene Keys) --------------
// [nome, corpo, lado]  lado: 'P' = Personalidade (natal) | 'D' = Design (pré-natal)
const ESFERAS_GENE_KEYS = [
  ['Obra de Vida (Life\'s Work)', 'Sol',      'P', 'Ativação'],
  ['Evolução',                    'Terra',    'P', 'Ativação'],
  ['Radiância',                   'Sol',      'D', 'Ativação'],
  ['Propósito',                   'Terra',    'D', 'Ativação'],
  ['Atração',                     'Lua',      'D', 'Vênus'],
  ['QI',                          'Venus',    'P', 'Vênus'],
  ['QE',                          'Marte',    'P', 'Vênus'],
  ['QS',                          'Venus',    'D', 'Vênus'],
  ['Núcleo / Vocação',            'Marte',    'D', 'Vênus/Pérola'],
  ['Cultura',                     'Jupiter',  'D', 'Pérola'],
  ['Pérola',                      'Jupiter',  'P', 'Pérola'],
  ['Marca (Brand)',               'Sol',      'P', 'Pérola'],
  ['Criatividade',                'Urano',    'D', 'Extra'],
  ['Relacionamento',              'Mercurio', 'P', 'Extra'],
  ['Estabilidade',                'Saturno',  'D', 'Extra']
];

// --- Tzolkin / Dreamspell ------------------------------------
const SELOS = ['Dragão','Vento','Noite','Semente','Serpente','Enlaçador de Mundos','Mão','Estrela','Lua','Cão','Macaco','Humano','Caminhante do Céu','Mago','Águia','Guerreiro','Terra','Espelho','Tormenta','Sol'];
const CORES_SELO = ['Vermelho','Branco','Azul','Amarelo'];
const TONS = ['Magnético','Lunar','Elétrico','Auto-existente','Entonado','Rítmico','Ressonante','Galáctico','Solar','Planetário','Espectral','Cristal','Cósmico'];

// --- Arcanos Maiores (Tarô Mitológico — mitologia grega) ------
const ARCANOS = [
  [0,'O Louco','Dioniso'],[1,'O Mago','Hermes'],[2,'A Sacerdotisa','Perséfone'],
  [3,'A Imperatriz','Deméter'],[4,'O Imperador','Zeus'],[5,'O Hierofante','Quíron'],
  [6,'Os Amantes','Páris'],[7,'A Carruagem','Ares'],[8,'A Justiça','Atena'],
  [9,'O Eremita','Cronos'],[10,'A Roda da Fortuna','As Moiras'],[11,'A Força','Héracles'],
  [12,'O Enforcado','Prometeu'],[13,'A Morte','Hades'],[14,'A Temperança','Íris'],
  [15,'O Diabo','Pã'],[16,'A Torre','Poseidon'],[17,'A Estrela','Afrodite'],
  [18,'A Lua','Hécate'],[19,'O Sol','Apolo'],[20,'O Julgamento','Hermes Psicopompo'],
  [21,'O Mundo','Hermafrodito']
];

// --- Numerologia: tabelas de conversão -----------------------
// CONFIGURÁVEL — a tabela vigente é decisão editorial de Elvis.
const TABELAS_NUMEROLOGIA = {
  cabalistica_hebraica: {
    rotulo: 'Cabalística (gematria hebraica, 1–400)',
    valores: {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:9,K:10,L:20,M:30,N:40,O:50,
              P:60,Q:70,R:80,S:90,T:100,U:200,V:200,W:200,X:300,Y:9,Z:400}
  },
  pitagorica: {
    rotulo: 'Pitagórica (1–9)',
    valores: {A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,J:1,K:2,L:3,M:4,N:5,O:6,
              P:7,Q:8,R:9,S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8}
  }
};

const SIGNOS = ['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'];

// --- Nomes dos 36 canais -------------------------------------
const NOMES_CANAIS = {
  '1-8':'Inspiração','2-14':'A Batida','3-60':'Mutação','4-63':'Lógica','5-15':'Ritmo',
  '6-59':'Acasalamento','7-31':'O Alfa','9-52':'Concentração','10-20':'Despertar',
  '10-34':'Exploração','10-57':'A Forma Perfeita','11-56':'Curiosidade','12-22':'Abertura',
  '13-33':'O Pródigo','16-48':'Comprimento de Onda','17-62':'Aceitação','18-58':'Perfeição',
  '19-49':'Síntese','20-34':'Carisma','20-57':'A Onda Cerebral','21-45':'A Linha do Dinheiro',
  '23-43':'Estruturação','24-61':'Consciência','25-51':'Iniciação','26-44':'Rendição',
  '27-50':'Preservação','28-38':'Luta','29-46':'Descoberta','30-41':'Reconhecimento',
  '32-54':'Transformação','34-57':'Poder','35-36':'Transitoriedade','37-40':'Comunidade',
  '39-55':'Emotividade','42-53':'Maturação','47-64':'Abstração'
};

// --- Nomes dos centros no padrão usado por Elvis --------------
const NOMES_CENTROS = {
  Cabeca:'Coronário', Ajna:'Ajna', Garganta:'Laríngeo', G:'Centro G', Coracao:'Ego',
  Sacral:'Sacral', PlexoSolar:'Plexo Solar', Baco:'Esplênico', Raiz:'Raiz'
};

// --- Assinatura energética e tema emocional, por tipo ---------
const ASSINATURA_TEMA = {
  'Gerador':               { assinatura:'Satisfação', tema:'Frustração' },
  'Gerador Manifestante':  { assinatura:'Satisfação', tema:'Frustração' },
  'Manifestador':          { assinatura:'Paz',        tema:'Raiva' },
  'Projetor':              { assinatura:'Sucesso',    tema:'Amargura' },
  'Refletor':              { assinatura:'Surpresa',   tema:'Decepção' }
};

// --- As quatro Variáveis ---------------------------------------
// Cada uma vem da COR de uma ativação específica; a variante vem do TOM.
// Conferido contra o mapa de Elvis: 4 de 4 batem.
const VARIAVEIS = {
  digestao:    { fonte:'Sol', lado:'design',        rotulo:'Digestão',
    cores:['Apetite','Paladar','Sede','Toque','Som','Luz'],
    variantes:[['Consecutivo','Alternado'],['Aberto','Fechado'],['Quente','Frio'],
               ['Calmo','Nervoso'],['Alto','Baixo'],['Direta','Indireta']] },
  ambiente:    { fonte:'NodoNorte', lado:'design',  rotulo:'Ambiente',
    cores:['Cavernas','Mercados','Cozinhas','Montanhas','Vales','Costas'],
    variantes:[['Seletiva','Misturada'],['Interno','Externo'],['Úmida','Seca'],
               ['Ativa','Passiva'],['Estreito','Amplo'],['Natural','Artificial']] },
  perspectiva: { fonte:'NodoNorte', lado:'personalidade', rotulo:'Perspectiva',
    cores:['Sobrevivência','Possibilidade','Poder','Querer','Probabilidade','Pessoal'],
    variantes:[['Foco','Periferia'],['Foco','Periferia'],['Foco','Periferia'],
               ['Foco','Periferia'],['Foco','Periferia'],['Foco','Periferia']] },
  motivacao:   { fonte:'Sol', lado:'personalidade', rotulo:'Motivação',
    cores:['Medo','Esperança','Desejo','Necessidade','Culpa','Inocência'],
    variantes:[['Comunalista','Separatista'],['Teísta','Antiteísta'],['Líder','Seguidor'],
               ['Novato','Mestre'],['Condicionador','Condicionado'],['Observador','Observado']] }
};

// Os seis sentidos, pelo TOM
const SENTIDOS = ['Olfato','Paladar','Visão externa','Visão interna','Sensação','Toque'];
const SENTIDO_SUPERPODER = {
  'Olfato':'discernimento do que está fora do lugar',
  'Paladar':'seleção — saber o que serve e o que não serve',
  'Visão externa':'leitura do detalhe concreto',
  'Visão interna':'imaginação e projeção do que ainda não existe',
  'Sensação':'percepção do clima antes de qualquer palavra',
  'Toque':'superpoder da generosidade'
};

// --- Cruz da Encarnação ---------------------------------------
// O nome vem do CONJUNTO dos quatro portões. A tabela oficial tem 192 nomes;
// aqui entram os já confirmados. O motor devolve sempre ângulo + portões,
// mesmo quando o nome ainda não está na tabela.
// Chave = "ÂNGULO|portão do Sol da Personalidade".
// Regra da fonte (Global Incarnation Index, p.174): o nome da cruz é definido
// pelo hexagrama do Sol da Personalidade somado à geometria — os portões do
// Design variam com o perfil sem mudar o nome.
// Só entram aqui os nomes com confirmação direta de fonte. O motor nunca inventa:
// sem entrada na tabela, devolve ângulo + portões + quarter, que são exatos.
const CRUZES = {
  'ÂNGULO DIREITO|13':'Cruz da Esfinge',
  'ÂNGULO ESQUERDO|13':'Cruz das Máscaras',
  'ÂNGULO DIREITO|6':'Cruz do Éden',
  'ÂNGULO DIREITO|36':'Cruz do Éden',
  'ÂNGULO DIREITO|12':'Cruz do Éden',
  'ÂNGULO DIREITO|11':'Cruz do Éden',
  'ÂNGULO DIREITO|49':'Cruz da Explicação',
  'JUSTAPOSIÇÃO|49':'Cruz dos Princípios',
  'ÂNGULO ESQUERDO|49':'Cruz da Revolução',
  'ÂNGULO DIREITO|41':'Cruz do Inesperado',
  'JUSTAPOSIÇÃO|41':'Cruz da Fantasia',
  'ÂNGULO ESQUERDO|41':'Cruz do Alfa',
  'ÂNGULO DIREITO|25':'Cruz do Vaso do Amor',
  'ÂNGULO DIREITO|3':'Cruz das Leis',
  'JUSTAPOSIÇÃO|19':'Cruz da Necessidade',
  'JUSTAPOSIÇÃO|36':'Cruz da Crise'
};

// --- Quarters (a roda dividida em quatro) ---------------------
// Fronteiras conferidas contra o material do Projeto Original e contra
// "Incarnation Crosses — The Global Incarnation Index" (Ra Uru Hu).
const QUARTERS = [
  { nome:'Quarter da Iniciação', reino:'Reino de Alcyone', porta:'13 a 24',
    tema:'Propósito cumprido através da Mente', mistico:'A testemunha retorna',
    texto:'Você está aqui para encontrar respostas — e é ao encontrá-las que ganha base para agir. A mente ressoa com tudo, então quase qualquer fonte pode te atrair. O tema é iniciação, não imitação: estudar importa porque te leva ao seu próprio entendimento, não ao de outro.' },
  { nome:'Quarter da Civilização', reino:'Reino de Duhbe', porta:'2 a 33',
    tema:'Propósito cumprido através da Forma', mistico:'Do útero ao quarto',
    texto:'Sua vida é vivida principalmente através do corpo e do que ele constrói. Não existe uma única maneira — o tema é usar o corpo e materializar. Por isso as necessidades materiais pesam. A sombra é o materialismo sem medida. Seu propósito também se cumpre pelo que você diz e pelo que dizem a você.' },
  { nome:'Quarter da Dualidade', reino:'Reino de Júpiter', porta:'7 a 44',
    tema:'Propósito cumprido através dos vínculos', mistico:'Medida por medida',
    texto:'Sua vida é sobre interagir, se ver no outro e aprender com isso. Não convém ter pressa nos laços íntimos. Todo vínculo tem desafio — aqui o trabalho é saber qual desafio te faz evoluir e qual só te consome.' },
  { nome:'Quarter da Mutação', reino:'Reino de Sirius', porta:'1 a 19',
    tema:'Propósito cumprido através da Transformação', mistico:'Aceitar a morte',
    texto:'É por este quarter que a mutação entra no mundo. O programa inicia a mudança, não você — e por isso ela chega no tempo dela, não no seu. Sua vida se cumpre quando você aceita atravessar o que termina para que algo novo possa começar.' }
];
// ordem da roda a partir do portão 13 — define a qual quarter cada portão pertence
const ORDEM_QUARTERS = [13,49,30,55,37,63,22,36,25,17,21,51,42,3,27,24,
  2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,
  7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,
  1,43,14,34,9,5,26,11,10,58,38,54,61,60,41,19];

// --- O que cada geometria de cruz significa -------------------
const GEOMETRIA_CRUZ = {
  'Ângulo Direito': { destino:'Destino Pessoal',
    texto:'Você está numa jornada pessoal — aprendendo sobre si e navegando o mundo pelo próprio desenho. Não é egocentrismo: é que a sua tarefa principal é compreender e habitar a própria individualidade. Ao viver isso de verdade, você vira exemplo sem tentar ser. O desafio aparece quando você se sente pressionado a viver conforme a expectativa de outro.' },
  'Justaposição': { destino:'Destino Fixo',
    texto:'Você tem um propósito específico e focado — como uma estrada reta em direção a um ponto. É o caminho mais singular e inabalável entre as três geometrias. Por isso rotina e consistência confortam. O risco é a rigidez: manter o foco sem virar imóvel.' },
  'Ângulo Esquerdo': { destino:'Karma Transpessoal',
    texto:'O seu propósito está entrelaçado com o dos outros. Você está aqui para aprender pela interação — orientando ou sendo orientado, numa dança de dar e receber. Os desafios giram em torno de relacionamento: sentir que dá mais do que recebe, ou o contrário. O trabalho é o equilíbrio.' }
};

/* ---- src/psicometria.mjs ---- */
// ============================================================
// O JOGO DA VIDA — Camada psicométrica
// Um único inventário (IPIP-50, domínio público) gera três oráculos:
// Big Five, tipologia de 4 letras e temperamento.
// Eneagrama usa banco autoral próprio (36 itens) — sem licença de terceiro.
// ============================================================

// ---------- IPIP-50 (Goldberg Big-Five Factor Markers) -------
// Itens em domínio público (ipip.ori.org). Tradução PT-BR autoral.
// f: fator | s: sentido (+1 direto, -1 invertido)
const IPIP50 = [
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

const FATORES = {
  E:'Extroversão', A:'Amabilidade', C:'Conscienciosidade',
  N:'Neuroticismo (instabilidade emocional)', O:'Abertura / Intelecto'
};

// respostas: {id: 1..5}
function bigFive(respostas) {
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
function tipologia4Letras(bf) {
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
function temperamento(bf) {
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
const ENEAGRAMA_ITENS = [
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
const ENEAGRAMA_NOMES = {
  1:'O Perfeccionista', 2:'O Prestativo', 3:'O Realizador', 4:'O Individualista',
  5:'O Investigador', 6:'O Leal', 7:'O Entusiasta', 8:'O Desafiador', 9:'O Pacificador'
};
const ENEAGRAMA_PAIXAO = {
  1:'Ira', 2:'Orgulho', 3:'Vaidade', 4:'Inveja', 5:'Avareza',
  6:'Medo', 7:'Gula', 8:'Luxúria/Excesso', 9:'Preguiça (acídia)'
};
function eneagrama(respostas) {
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

function perfilPsicometrico(respIPIP, respEne) {
  const bf = bigFive(respIPIP);
  return {
    bigFive: bf,
    tipologia: tipologia4Letras(bf),
    temperamento: temperamento(bf),
    eneagrama: respEne ? eneagrama(respEne) : null
  };
}

/* ---- src/motor.mjs ---- */
// ============================================================
// O JOGO DA VIDA — Motor de Oráculos (núcleo)
// Roda em Node, Deno (Edge Function) e navegador.
// Única dependência: astronomy-engine (MIT, sem arquivos externos, sem rede).
// ============================================================


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
function localParaUTC({ ano, mes, dia, hora = 12, minuto = 0, tz }) {
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

function posicoes(dataUTC) {
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
function dataDesign(dataUTC) {
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
function portaoDe(lonGrau) {
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
function signoDe(lon) {
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
function casas(dataUTC, latitude, longitude, sistema = 'placidus') {
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
function casaDe(lon, cusps) {
  for (let i = 0; i < 12; i++) {
    const a = cusps[i], b = cusps[(i + 1) % 12];
    const larg = norm360(b - a), pos = norm360(lon - a);
    if (pos < larg) return i + 1;
  }
  return 1;
}

// Distância angular (em minutos de arco) até a cúspide mais próxima, e qual é ela.
// ORBE_SOLEIRA: dentro disso, afirmar UMA casa é fingir precisão que o dado não tem.
const ORBE_SOLEIRA = 1.0; // graus
function posicaoNaCasa(lon, cusps) {
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
function desenhoHumano(posPers, posDes) {
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
function geneKeys(posPers, posDes) {
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
function kinMaia(ano, mes, dia) {
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
function numerologia(nomeCompleto, ano, mes, dia, tabela = 'cabalistica_hebraica') {
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
function arcanoTaro(ano, mes, dia) {
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
function mapaCompleto({ nome, ano, mes, dia, hora = 12, minuto = 0, tz, lat, lon, sistemaCasas = 'placidus', tabelaNumerologia = 'cabalistica_hebraica' }) {
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

global.Oraculos = { mapaCompleto, posicoes, casas, portaoDe, signoDe, desenhoHumano, geneKeys,
  kinMaia, numerologia, arcanoTaro, dataDesign, localParaUTC,
  IPIP50, ENEAGRAMA_ITENS, ENEAGRAMA_NOMES, ENEAGRAMA_PAIXAO, perfilPsicometrico,
  bigFive, tipologia4Letras, temperamento, eneagrama,
  RODA_PORTOES, INICIO_RODA, CENTROS, PORTAO_CENTRO, CANAIS, SIGNOS, ARCANOS,
  TABELAS_NUMEROLOGIA, CORPOS_HD };
})(typeof window !== 'undefined' ? window : globalThis);
