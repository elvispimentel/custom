// ============================================================
// O JOGO DA VIDA — Motor de Oráculos
// tabelas.mjs — dados canônicos (nenhuma dependência externa)
// ============================================================

// --- Roda de Portões (Rave Mandala) --------------------------
// Portão 41 inicia em 2°00'00" de Aquário = 302.00° eclíptica tropical.
// Cada portão = 360/64 = 5.625°. Cada linha = 0.9375°.
export const RODA_PORTOES = [
  41,19,13,49,30,55,37,63,22,36,25,17,21,51,42,3,
  27,24,2,23,8,20,16,35,45,12,15,52,39,53,62,56,
  31,33,7,4,29,59,40,64,47,6,46,18,48,57,32,50,
  28,44,1,43,14,34,9,5,26,11,10,58,38,54,61,60
];
export const INICIO_RODA = 302.0; // grau eclíptico onde o portão 41 começa

// --- Portão → Centro ----------------------------------------
export const CENTROS = {
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
export const PORTAO_CENTRO = (() => {
  const m = {};
  for (const [c, gs] of Object.entries(CENTROS)) for (const g of gs) m[g] = c;
  return m;
})();

export const MOTORES = ['Sacral','Raiz','PlexoSolar','Coracao'];

// --- 36 Canais ----------------------------------------------
export const CANAIS = [
  [1,8],[2,14],[3,60],[4,63],[5,15],[6,59],[7,31],[9,52],
  [10,20],[10,34],[10,57],[11,56],[12,22],[13,33],[16,48],[17,62],
  [18,58],[19,49],[20,34],[20,57],[21,45],[23,43],[24,61],[25,51],
  [26,44],[27,50],[28,38],[29,46],[30,41],[32,54],[34,57],[35,36],
  [37,40],[39,55],[42,53],[47,64]
];

// --- Corpos usados nas 13 ativações --------------------------
export const CORPOS_HD = ['Sol','Terra','NodoNorte','NodoSul','Lua','Mercurio','Venus','Marte','Jupiter','Saturno','Urano','Netuno','Plutao'];

// --- Esferas do Perfil Hologenético (Gene Keys) --------------
// [nome, corpo, lado]  lado: 'P' = Personalidade (natal) | 'D' = Design (pré-natal)
export const ESFERAS_GENE_KEYS = [
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
export const SELOS = ['Dragão','Vento','Noite','Semente','Serpente','Enlaçador de Mundos','Mão','Estrela','Lua','Cão','Macaco','Humano','Caminhante do Céu','Mago','Águia','Guerreiro','Terra','Espelho','Tormenta','Sol'];
export const CORES_SELO = ['Vermelho','Branco','Azul','Amarelo'];
export const TONS = ['Magnético','Lunar','Elétrico','Auto-existente','Entonado','Rítmico','Ressonante','Galáctico','Solar','Planetário','Espectral','Cristal','Cósmico'];

// --- Arcanos Maiores (Tarô Mitológico — mitologia grega) ------
export const ARCANOS = [
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
export const TABELAS_NUMEROLOGIA = {
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

export const SIGNOS = ['Áries','Touro','Gêmeos','Câncer','Leão','Virgem','Libra','Escorpião','Sagitário','Capricórnio','Aquário','Peixes'];

// --- Nomes dos 36 canais -------------------------------------
export const NOMES_CANAIS = {
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
export const NOMES_CENTROS = {
  Cabeca:'Coronário', Ajna:'Ajna', Garganta:'Laríngeo', G:'Centro G', Coracao:'Ego',
  Sacral:'Sacral', PlexoSolar:'Plexo Solar', Baco:'Esplênico', Raiz:'Raiz'
};

// --- Assinatura energética e tema emocional, por tipo ---------
export const ASSINATURA_TEMA = {
  'Gerador':               { assinatura:'Satisfação', tema:'Frustração' },
  'Gerador Manifestante':  { assinatura:'Satisfação', tema:'Frustração' },
  'Manifestador':          { assinatura:'Paz',        tema:'Raiva' },
  'Projetor':              { assinatura:'Sucesso',    tema:'Amargura' },
  'Refletor':              { assinatura:'Surpresa',   tema:'Decepção' }
};

// --- As quatro Variáveis ---------------------------------------
// Cada uma vem da COR de uma ativação específica; a variante vem do TOM.
// Conferido contra o mapa de Elvis: 4 de 4 batem.
export const VARIAVEIS = {
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
export const SENTIDOS = ['Olfato','Paladar','Visão externa','Visão interna','Sensação','Toque'];
export const SENTIDO_SUPERPODER = {
  'Olfato':'discernimento do que está fora do lugar',
  'Paladar':'seleção — saber o que serve e o que não serve',
  'Visão externa':'leitura do detalhe concreto',
  'Visão interna':'imaginação e projeção do que ainda não existe',
  'Sensação':'percepção do clima antes de qualquer palavra',
  'Toque':'superpoder da generosidade'
};

// --- Cruz da Encarnação --------------------------------------
// O nome vem do CONJUNTO dos quatro portões. A tabela oficial tem 192 nomes;
// aqui entram os já confirmados. O motor devolve sempre ângulo + portões,
// mesmo quando o nome ainda não está na tabela.
// Chave = "ÂNGULO|portão do Sol da Personalidade".
// Regra da fonte (Global Incarnation Index, p.174): o nome da cruz é definido
// pelo hexagrama do Sol da Personalidade somado à geometria — os portões do
// Design variam com o perfil sem mudar o nome.
// Só entram aqui os nomes com confirmação direta de fonte. O motor nunca inventa:
// sem entrada na tabela, devolve ângulo + portões + quarter, que são exatos.
export const CRUZES = {
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
export const QUARTERS = [
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
export const ORDEM_QUARTERS = [13,49,30,55,37,63,22,36,25,17,21,51,42,3,27,24,
  2,23,8,20,16,35,45,12,15,52,39,53,62,56,31,33,
  7,4,29,59,40,64,47,6,46,18,48,57,32,50,28,44,
  1,43,14,34,9,5,26,11,10,58,38,54,61,60,41,19];

// --- O que cada geometria de cruz significa -------------------
export const GEOMETRIA_CRUZ = {
  'Ângulo Direito': { destino:'Destino Pessoal',
    texto:'Você está numa jornada pessoal — aprendendo sobre si e navegando o mundo pelo próprio desenho. Não é egocentrismo: é que a sua tarefa principal é compreender e habitar a própria individualidade. Ao viver isso de verdade, você vira exemplo sem tentar ser. O desafio aparece quando você se sente pressionado a viver conforme a expectativa de outro.' },
  'Justaposição': { destino:'Destino Fixo',
    texto:'Você tem um propósito específico e focado — como uma estrada reta em direção a um ponto. É o caminho mais singular e inabalável entre as três geometrias. Por isso rotina e consistência confortam. O risco é a rigidez: manter o foco sem virar imóvel.' },
  'Ângulo Esquerdo': { destino:'Karma Transpessoal',
    texto:'O seu propósito está entrelaçado com o dos outros. Você está aqui para aprender pela interação — orientando ou sendo orientado, numa dança de dar e receber. Os desafios giram em torno de relacionamento: sentir que dá mais do que recebe, ou o contrário. O trabalho é o equilíbrio.' }
};
