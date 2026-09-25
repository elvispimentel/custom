/* ===========================================================
   O Jogo da Vida — gerador do Autorretrato
   Tom de voz oficial (Módulo 01 / Dossiê de Inteligência):
   provocativo, profundo, contemplativo e espiritual, com ritmo
   hipnótico e chamadas diretas à consciência.
   Nunca autoajuda infantil. Nunca promessa mística vaga.
   Vocabulário oficial da VSL: avatar, inventário, fase, chefão,
   mapa, evidência, Forja, campo, Alfândega da Realidade.
   =========================================================== */
(function(global){
'use strict';

/* ---- os 22 arcanos: o fio, o preço, a cena ---- */
var ARCANO={
 0:{d:'Dioniso',fio:'começar sem garantia nenhuma',preco:'largar antes do fim, e chamar isso de liberdade',cena:'quem salta primeiro e olha depois'},
 1:{d:'Hermes',fio:'traduzir uma coisa em outra — dor em método, ideia em movimento',preco:'resolver por fora e nunca fixar raiz',cena:'quem atravessa mundos e faz os dois se entenderem'},
 2:{d:'Perséfone',fio:'perceber o que não foi dito na sala',preco:'guardar tanto que ninguém te alcança',cena:'quem tem a chave dos dois mundos e circula entre eles'},
 3:{d:'Deméter',fio:'fazer crescer o que você toca',preco:'sufocar de tanto cuidar',cena:'quem alimenta e vê brotar'},
 4:{d:'Zeus',fio:'dar ordem ao que estava solto',preco:'a estrutura que vira gaiola',cena:'quem coloca eixo onde havia bagunça'},
 5:{d:'Quíron',fio:'ensinar exatamente aquilo que te feriu',preco:'transformar a própria ferida em dogma',cena:'o curador que conhece o caminho porque andou nele sangrando'},
 6:{d:'Páris',fio:'escolher — e viver com o que a escolha custou',preco:'adiar até a vida escolher por você',cena:'quem está diante de duas coisas verdadeiras e só pode ficar com uma'},
 7:{d:'Ares',fio:'colocar força numa direção só',preco:'atropelar o que estava no caminho',cena:'quem avança enquanto os outros ainda medem'},
 8:{d:'Atena',fio:'enxergar o peso real das coisas antes de decidir',preco:'julgar quando era pra escutar',cena:'quem pesa antes de agir — e por isso é chamado quando a coisa aperta'},
 9:{d:'Cronos',fio:'recuar pra enxergar, deixar o tempo trabalhar',preco:'o recuo que vira esconderijo',cena:'quem sai da sala pra entender a sala'},
 10:{d:'as Moiras',fio:'ler o momento e entrar nele',preco:'confundir ciclo com destino e parar de agir',cena:'quem percebe a roda girar e aprende a hora de subir'},
 11:{d:'Héracles',fio:'domar pela insistência, não pelo golpe',preco:'confundir persistência com teimosia',cena:'quem faz um trabalho de cada vez até o impossível virar rotina'},
 12:{d:'Prometeu',fio:'ver de um ângulo que ninguém viu, e pagar por isso',preco:'o martírio que vira identidade',cena:'quem entrega o fogo sabendo o preço'},
 13:{d:'Hades',fio:'deixar morrer o que já acabou',preco:'segurar o corpo por medo do vazio',cena:'quem fecha o ciclo antes de ele apodrecer'},
 14:{d:'Íris',fio:'dosar — misturar na medida em que funciona',preco:'nunca ir até o fim de nada',cena:'a ponte entre dois mundos que não se falavam'},
 15:{d:'Pã',fio:'olhar de frente o instinto e o que te prende',preco:'o pacto confortável que você chama de escolha',cena:'quem conhece a própria fome e decide o que fazer com ela'},
 16:{d:'Poseidon',fio:'derrubar o que foi construído no lugar errado',preco:'destruir por hábito, não por necessidade',cena:'quem sacode o chão e descobre o que estava mal fundado'},
 17:{d:'Afrodite',fio:'reconhecer a forma nova que nasce depois do colapso',preco:'idealizar o que ainda nem existe',cena:'quem emerge quando a tempestade passa'},
 18:{d:'Hécate',fio:'andar no escuro sem fingir que enxerga',preco:'a confusão que vira desculpa pra não escolher',cena:'quem fica na encruzilhada com a tocha na mão'},
 19:{d:'Apolo',fio:'mostrar com clareza o que estava embaralhado',preco:'o brilho que ofusca em vez de iluminar',cena:'quem traz luz e por isso é procurado'},
 20:{d:'Hermes Psicopompo',fio:'atender ao chamado de voltar e acertar as contas',preco:'a culpa que paralisa em vez de mover',cena:'quem é chamado de volta pra terminar o que ficou'},
 21:{d:'Hermafrodito',fio:'integrar o que parecia oposto',preco:'nunca fechar, por medo de acabar',cena:'quem reúne as duas naturezas numa só'}
};

/* ---- os cinco tipos, em tom de revelação ---- */
var TIPO={
 'Gerador':{motor:'Você tem energia disponível todo dia. Não é força de vontade. É combustível de fábrica.',
   erro:'Talvez você venha iniciando as coisas do zero, por decisão da cabeça, sem que nada tenha te convidado. E aí a energia não vira resultado — vira frustração.',
   certo:'Observa: o seu corpo responde antes da sua cabeça justificar. Quando aparece alguma coisa e o peito acende, é sim. Quando não acende, era mentira — e você sabia.'},
 'Gerador Manifestante':{motor:'Você tem energia disponível todo dia e um atalho embutido. Enxerga o caminho curto e já está lá enquanto os outros ainda discutem o mapa.',
   erro:'Talvez o atrito que você vem sentindo não seja do atalho. Seja do silêncio antes dele. Você sai fazendo, e ninguém entendeu que você já tinha decidido.',
   certo:'Responder primeiro. Informar depois. Nessa ordem. O corpo sabe o que quer antes de você conseguir explicar — e explicar depois é o que mantém as pessoas do seu lado em vez de contra.'},
 'Manifestador':{motor:'Você não espera. Alguma coisa em você começa, e o mundo reage.',
   erro:'Talvez você venha confundindo avisar com pedir permissão. Não é a mesma coisa. Uma é respeito; a outra é submissão — e você recusa a segunda em nome da primeira.',
   certo:'Informar antes de agir. Uma frase dita antes economiza meses de resistência depois.'},
 'Projetor':{motor:'Você enxerga o sistema melhor do que quem está dentro dele. Vê o gargalo, a pessoa errada no lugar errado, o que ninguém disse em voz alta.',
   erro:'Talvez você venha entregando essa leitura sem que ninguém tenha chamado. E aí ela não entra. Vira intromissão em vez de direção — e você acha que o problema foi a mensagem.',
   certo:'Reconhecimento primeiro. Contribuição depois. Não é orgulho. É física: sem convite, o que você vê não atravessa.'},
 'Refletor':{motor:'Você é o espelho do ambiente. O que você sente numa sala diz mais sobre a sala do que sobre você.',
   erro:'Talvez você venha decidindo no calor de um dia. E o dia seguinte já é outro mundo, com outra sala, com outra pessoa dentro de você.',
   certo:'Um ciclo lunar antes de qualquer decisão grande. E a pergunta que não pode parar: isso que estou sentindo é meu, ou é daqui?'}
};

var TERRA_FIRME={Cabeca:'as suas perguntas nascem de dentro',Ajna:'o seu jeito de processar é seu',
 Garganta:'a sua voz não muda de dono conforme a sala',G:'você sabe de onde fala',
 Coracao:'você sustenta o que promete',Sacral:'você aguenta volume e ainda gosta',
 PlexoSolar:'o clima é seu, não do ambiente',Baco:'o seu instinto avisa em tempo real',
 Raiz:'você se move sob prazo sem quebrar'};
var AREIA={Cabeca:'você pensa problema que não é seu',Ajna:'você não fixa certeza — e às vezes finge convicção pra pertencer',
 Garganta:'a sua voz pega o sotaque da sala',G:'a direção vem do lugar e da companhia',
 Coracao:'você promete pra provar valor',Sacral:'você não sabe a hora de parar antes de esvaziar',
 PlexoSolar:'você sente a emoção que está no ar e chama de sua',Baco:'você amplifica o medo dos outros e se agarra ao que já não serve',
 Raiz:'você corre pra se livrar da pressão, não pra chegar'};

var SIGNO_SOL={'Áries':'começo','Touro':'permanência','Gêmeos':'circulação','Câncer':'pertencimento',
 'Leão':'presença','Virgem':'refinamento','Libra':'equilíbrio','Escorpião':'profundidade',
 'Sagitário':'expansão','Capricórnio':'construção','Aquário':'ruptura','Peixes':'dissolução'};
var CASA_TEMA={1:'em quem você é',2:'no que é seu',3:'no que você fala',4:'na sua raiz',
 5:'no que você cria',6:'no seu ofício e no seu corpo',7:'nos seus vínculos',8:'no que morre e no que é dos outros',
 9:'no que você acredita',10:'no que você constrói em público',11:'no seu grupo',12:'no que você não vê'};
var MES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function primeiro(n){return String(n||'').trim().split(/\s+/)[0];}

/* =========== o gerador =========== */
function FX(t){try{return window.GEN?window.GEN.flex(t):t;}catch(e){return t;}}
function historia(dados){
  var m=dados.mapa, hd=m.desenhoHumano, S=dados.entrada, bf=dados.bigFive, tp=dados.tipologia;
  var inc=dados.horaIncerta, pn=primeiro(S.nome);
  var arc=ARCANO[m.taro.numero]||ARCANO[0];
  var sol=m.astral.planetas.Sol;
  var mov=[];

  /* M1 — o instante */
  var quando=S.dia+' de '+MES[S.mes-1]+' de '+S.ano;
  var hora=inc?'':', às '+String(S.hora).padStart(2,'0')+'h'+String(S.minuto).padStart(2,'0');
  mov.push({t:'O instante',
    p:['Presta atenção no seguinte, '+pn+'.',
       'Em '+quando+hora+' — '+S.cidade+' — alguma coisa se organizou. Não é metáfora. Os corpos que estavam no céu naquele minuto formaram um arranjo que não existia antes e não volta a existir — nem daqui a mil anos.',
       'Duas coisas diferentes, e vale separar: as posições acima são calculadas — astronomia, medida, verificável. O significado que se atribui a elas é leitura simbólica, e leitura é lente, não laudo.',
       'Esse arranjo não decidiu nada por você. Ele só marcou o ponto de partida.',
       'Observa isso: o que vem abaixo não é quem você vai ser. É a matéria com que você chegou. O que você fez com ela até hoje é outra história — e essa história é sua.']});

  /* M2 — a carta */
  mov.push({t:'A sua carta',
    p:['Aqui a leitura entra na mitologia do RPG.',
       'No Jogo da Vida, a leitura entra pelo Tarô Mitológico — o baralho que troca os 22 arcanos maiores pelos deuses e figuras da mitologia grega. Não foi escolha estética. O Tarô é uma ferramenta ancestral de leitura da experiência humana, e os mitos gregos são o vocabulário mais antigo que temos para nomear as forças que atravessam uma vida. Juntos, os dois explicam sem precisar de teoria.',
       'A sua carta é a '+m.taro.numero+' — '+m.taro.arcano+'. Na mitologia grega, '+arc.d+'.',
       'Cada arcano carrega um deus, e cada deus nomeia um jeito recorrente de a vida se organizar. Não é entidade pra cultuar nem previsão do que vai acontecer. É vocabulário — uma forma da psique que aparece em você, em mim, e em todo mundo que já viveu.',
       'O seu é o de '+arc.cena+'.',
       'Traduz isso pra dentro da sua vida — como hipótese, não como sentença. O fio que esta carta propõe para a sua história é '+arc.fio+'. Talvez você nunca tenha nomeado assim. Mas está lá — no tipo de conversa em que você entra, no tipo de problema que te procura, no tipo de gente que aparece.',
       'E toda carta cobra um preço. O que esta imagem coloca como pergunta pra você é isto: '+arc.preco+'. Se encontrar correspondência na sua experiência, não é defeito — é a conta que vem junto com o talento. E reconhecer a conta já é metade do trabalho.']});

  /* M3 — o motor */
  var T=TIPO[hd.tipo]||TIPO['Gerador'];
  mov.push({t:'Como o seu avatar funciona',
    p:[(inc?'Pela leitura mais provável, dentro do modelo do Desenho Humano você é ':'Dentro do modelo do Desenho Humano, você é ')+FX(hd.tipo)+'. '+T.motor,
       T.erro, T.certo,
       'A sua autoridade — no modelo, o lugar do corpo de onde a decisão certa tende a sair — é: '+hd.autoridade.toLowerCase()+'.',
       'E o seu perfil é '+hd.perfil+': '+FX(hd.perfilNome).toLowerCase()+'. Perfil é o papel que você faz na história dos outros. São dois: um que você sabe que faz. E um que os outros veem em você antes de você mesmo ver.']});

  /* M4 — o território */
  var def=hd.centrosDefinidos, ab=hd.centrosAbertos;
  var nomes={Cabeca:'Cabeça',Ajna:'Ajna',Garganta:'Garganta',G:'Centro G',Coracao:'Coração',
    Sacral:'Sacral',PlexoSolar:'Plexo Solar',Baco:'Baço',Raiz:'Raiz'};
  var pt=['O seu mapa tem nove centros. '+def.length+' definidos, '+ab.length+' abertos.',
    'Definido é terra firme. Funciona igual em qualquer sala, com qualquer gente, em qualquer ano da sua vida. Ninguém tira de você.',
    'Aberto não é fraqueza. Observa bem, porque essa é a parte que quase todo mundo lê errado: aberto é onde você absorve o ambiente. É onde o que está em volta entra em você e você chama de seu. E é exatamente ali que, com o tempo, você vira sábio — porque experimentou de tudo naquele lugar.'];
  if(def.length) pt.push('A sua terra firme — '+def.map(function(c){return nomes[c]+', '+TERRA_FIRME[c];}).join('; ')+'.');
  if(ab.length) pt.push('A sua areia — '+ab.map(function(c){return nomes[c]+', onde '+AREIA[c];}).join('; ')+'.');
  if(!inc){
    var casa=sol.naSoleira?('bem em cima da divisa entre a casa '+sol.entre[0]+' e a casa '+sol.entre[1])
      :('na casa '+sol.casa+' — '+CASA_TEMA[sol.casa]);
    pt.push('E o seu Sol está em '+sol.signo+', o gesto de '+(SIGNO_SOL[sol.signo]||'')+', '+casa+'. '+
     (sol.naSoleira?'Guarda essa. Qualquer programa que crave um lado só está fingindo uma precisão que a hora do seu nascimento não permite. É o primeiro lugar onde o mapa se cala — e onde só você decide.'
      :'A posição é calculada; o gesto é leitura. A casa aponta o território da vida onde essa leitura costuma se verificar com mais força — observa se bate com a sua experiência.'));
  } else {
    pt.push('O seu Sol está em '+sol.signo+', o gesto de '+(SIGNO_SOL[sol.signo]||'')+'. Sem a hora exata eu não digo em que território da vida isso acontece. Prefiro calar a inventar.');
  }
  mov.push({t:'Onde você pisa firme e onde você pisa areia',p:pt});

  /* M5 — o nó */
  var pn2=['Até aqui, tudo veio do céu. Agora entra o que você mesmo respondeu.',
   'Nas suas respostas você se descreveu como '+tp.tipo+'. Essas quatro letras não vêm do seu nascimento. Vêm de como você se enxerga hoje, neste mês, com a vida que você está vivendo agora. Daqui a um ano podem ser outras — e isso não é falha do teste. É o ponto.'];
  if(dados.divergencias && dados.divergencias.length){
    pn2.push('E é aqui que fica interessante, '+pn+'. Em '+(dados.divergencias.length===1?'um ponto':dados.divergencias.length+' pontos')+', o que o mapa diz e o que você diz não batem.');
    pn2.push('Observa isso com cuidado, porque não é erro de cálculo e não é contradição. É o lugar exato onde a sua decisão já está agindo por cima do desenho. Pode ser evolução. Pode ser condicionamento que você chamou de personalidade. As duas coisas se parecem por fora — e só a sua evidência separa uma da outra.');
  } else {
    pn2.push('E no seu caso, '+pn+', o que o mapa diz e o que você diz estão andando juntos. Isso é raro. Também significa que a pergunta de onde você muda a realidade vai ter que vir de outro lugar que não a contradição.');
  }
  mov.push({t:'E o que você diz de você',p:pn2});

  return mov;
}

/* fecho — Pista de Contribuição e transição final fundidas num movimento só.
   Não define missão, não recomenda profissão, não revela o Inventário.
   A pista é o mecanismo que produz o "e agora?" — não uma seção explicativa. */
function fecho(dados){
  var pn=primeiro(dados.entrada.nome);
  return [
   pn+', isso é o retrato. É honesto, é seu, e é de graça — porque se conhecer não deveria ter pedágio.',
   'Parte do que você leu confirmou o que você já sabia. Parte deixou uma pergunta. Ótimo. Não fecha essa pergunta ainda.',
   'Porque existe uma diferença entre reconhecer uma característica em você — e perceber onde ela já apareceu na sua vida profissional sem você notar que era a mesma peça.',
   'Olha para o que mais se repete neste retrato. Não como definição da sua missão. Como hipótese: em que momentos da sua trajetória você já usou exatamente isso para resolver um problema, organizar alguma coisa, ensinar, comunicar, cuidar, vender ou construir?',
   'Num trabalho. Num projeto. Numa conversa. Em algum problema que as pessoas sempre trazem pra você.',
   'Não precisa responder agora. Só guarda a pergunta. Porque talvez você esteja procurando a próxima direção olhando só para aquilo que ainda falta — quando parte dela pode estar espalhada por aquilo que você já carrega.',
   'Você chegou. O jogo te reconheceu. Você recebeu o seu mapa. Agora vem a pergunta natural.'
  ].join('\n\n');
}

global.Narrativa={historia:historia, fecho:fecho, ARCANO:ARCANO};
})(typeof window!=='undefined'?window:globalThis);

/* ===== Casas: áreas da vida ===== */
(function(g){
g.CASAS={
 1:{n:'Casa 1 — o corpo e a chegada',a:'aparência, vitalidade, o jeito de entrar numa sala e de começar as coisas'},
 2:{n:'Casa 2 — o que é seu',a:'dinheiro que você ganha, bens, talentos e o senso do próprio valor'},
 3:{n:'Casa 3 — a vizinhança',a:'fala, escrita, estudo curto, irmãos, o trajeto do dia a dia'},
 4:{n:'Casa 4 — a raiz',a:'casa, família, origem, o que te sustenta por baixo e ninguém vê'},
 5:{n:'Casa 5 — o que sai de você',a:'criação, filhos, prazer, palco, o risco que vale a pena'},
 6:{n:'Casa 6 — a rotina',a:'trabalho de todo dia, saúde, corpo em uso, serviço, o ajuste fino'},
 7:{n:'Casa 7 — o outro',a:'parceria, casamento, sociedade, contrato — e o adversário declarado'},
 8:{n:'Casa 8 — o partilhado e o que morre',a:'intimidade, recursos do outro, dívida, herança, crise e transformação'},
 9:{n:'Casa 9 — o longe',a:'fé, filosofia, estudo longo, estrangeiro, a busca por sentido'},
 10:{n:'Casa 10 — o topo',a:'carreira, reputação, o que você constrói à vista de todos'},
 11:{n:'Casa 11 — o grupo',a:'amizades, rede, causa coletiva, o futuro que se constrói junto'},
 12:{n:'Casa 12 — o que não se ê',a:'inconsciente, retiro, o que sabota em silêncio, o que te devolve pra dentro'}
};
g.CASA_CURTA=function(n){return g.CASAS[n]?g.CASAS[n].a:'';};
})(typeof window!=='undefined'?window:globalThis);
