(function(){
'use strict';
var O=window.Oraculos, CID=window.CIDADES;
var cidades=CID.c.map(function(s){var p=s.split('|');return {nome:p[0],uf:p[1],lat:+p[2],lon:+p[3],tz:CID.z[+p[4]]};});
var idx=cidades.map(function(c){return nrm(c.nome)+' '+c.uf.toLowerCase();});
function nrm(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var NC={Cabeca:'Cabeça',Ajna:'Ajna',Garganta:'Garganta',G:'Centro G',Coracao:'Coração',
        Sacral:'Sacral',PlexoSolar:'Plexo Solar',Baco:'Baço',Raiz:'Raiz'};

/* ---- o que cada centro significa dos dois lados ---- */
var DEF={Cabeca:'pressão mental própria — as suas perguntas nascem de você',
 Ajna:'jeito fixo de processar — a sua opinião é consistente',
 Garganta:'voz constante — você comunica do seu jeito, não do jeito do ambiente',
 G:'direção e identidade próprias — você sabe de onde fala',
 Coracao:'força de vontade constante — você sustenta o que promete',
 Sacral:'energia de trabalho todo dia — você aguenta volume e gosta disso',
 PlexoSolar:'onda emocional própria — o clima é seu, não do ambiente',
 Baco:'instinto próprio — você sente o perigo em tempo real',
 Raiz:'pressão própria — você se move sob prazo sem quebrar'};
var ABE={Cabeca:'absorve as perguntas dos outros — cuidado com resolver problema que não é seu',
 Ajna:'não fixa certeza — flexível de verdade, mas às vezes finge convicção pra pertencer',
 Garganta:'adapta a voz ao ambiente — e às vezes fala só pra ser notado',
 G:'a direção vem de fora — o lugar e a companhia pesam mais pra você do que para os outros',
 Coracao:'prova o próprio valor — cuidado com prometer pra provar',
 Sacral:'não tem energia constante — precisa saber a hora de parar antes de esvaziar',
 PlexoSolar:'sente a emoção do ambiente — evita conflito pra não ter que sentir',
 Baco:'amplifica o medo dos outros — e se agarra ao que já não serve',
 Raiz:'absorve pressão — corre pra se livrar da pressão, não pra chegar'};
var DELEG={Sacral:'trabalho de constância e volume — não é a sua energia, é a de quem tem Sacral definido',
 Coracao:'cobrança, negociação de valor e bater meta na raça — delegue ou estruture, não force',
 Raiz:'gestão de prazo e pressão — quem tem Raiz aberta vira refém do relógio',
 PlexoSolar:'mediar clima emocional de time — você absorve tudo e sai destruído'};
var GRUPO={'Gerador':'Você entra respondendo, não propondo. O grupo traz, o seu corpo responde — e o "sim" do corpo é mais confiável que a sua justificativa mental.',
 'Gerador Manifestante':'Você responde e já sai fazendo — pulando etapa. Funciona. O que quebra é não avisar: informe depois de responder, ou o grupo trava você.',
 'Manifestador':'Você inicia. Informe antes de agir — não é pedir permissão, é reduzir a resistência que sempre vem quando você se move sem avisar.',
 'Projetor':'Você enxerga o sistema melhor que quem está dentro dele. Mas a escuta vem depois do convite. Reconhecimento primeiro, contribuição depois.',
 'Refletor':'Você é o espelho do grupo. Leve um ciclo lunar antes de decidir e observe: o que você está sentindo pode ser o clima da sala, não você.'};

var CURTOS=[1,11,21,46, 7,17,27,32, 3,13,33,38, 4,14,29,39, 15,25,35,45];
var ITENS=CURTOS.map(function(id){return O.IPIP50.filter(function(i){return i.id===id;})[0];});

var S={etapa:0,sub:0,nome:'',data:'',hora:'',horaIncerta:false,cidade:null,email:'',tel:'',resp:{},video:0,okRelatorio:false,okNovidades:false,maior:false,ofertaVista:false,
  playerId:'',reflexao:'',utm:null,genero:''};
var VERSAO_APP='/*__VERSAO__*/';
try{
  var sv=localStorage.getItem('antessala3');
  if(sv){
    var ant=JSON.parse(sv);
    /* Versão nova não pode ficar escondida atrás de estado antigo.
       Era isso que fazia uma atualização "não mudar nada": a sessão salva
       devolvia a pessoa para onde ela tinha parado, e as telas novas —
       cartaz, abertura, escolha — nunca chegavam a aparecer.
       Aqui os dados da pessoa são preservados; o que se perde é só o
       "já vi isso", para que o novo comece do começo. */
    if(ant.versao && ant.versao!==VERSAO_APP){
      ant.etapa=0; ant.sub=0;
      try{ localStorage.removeItem('jc_instr_visto'); }catch(e){}
    }
    S=Object.assign(S,ant);
  }
}catch(e){}
S.versao=VERSAO_APP;
function salvar(){try{S.versao=VERSAO_APP;localStorage.setItem('antessala3',JSON.stringify(S));}catch(e){}}

/* =====================================================================
   IDENTIDADE E TELEMETRIA — INFRAESTRUTURA EXPERIMENTAL DA FASE 1
   ---------------------------------------------------------------------
   ATENÇÃO. localStorage NÃO é persistência garantida e NÃO é CRM:
     · o jogador pode limpar o navegador e apagar tudo;
     · não acompanha a pessoa entre navegadores nem entre dispositivos;
     · não é backup e não é fonte de verdade de nada.
   Serve exclusivamente como FILA TEMPORÁRIA até a Fase 2 (backend real).
   Perda de dado nesta fase é limitação aceita conscientemente, não bug.
   Nada aqui pode bloquear a experiência: toda falha é engolida em silêncio.
   ===================================================================== */
var FILA='jc_fila_eventos', PID='jc_player_id', ATRIB='jc_atribuicao', LIMITE_FILA=500;

function uuid(){
  try{ if(window.crypto&&crypto.randomUUID) return crypto.randomUUID(); }catch(e){}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,function(c){
    var r=Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);});
}
function ls(k,v){ try{ if(v===undefined) return localStorage.getItem(k);
  localStorage.setItem(k,v); return v; }catch(e){ return null; } }

/* player_id: nasce no primeiro carregamento e nunca muda. Nome jamais identifica. */
var playerId = ls(PID) || (function(){var id=uuid(); ls(PID,id); return id;})();
S.playerId = playerId;
/* session_id: novo a cada abertura da aba. */
var sessionId = uuid();

/* Atribuição: UTM lida da URL, guardada fora da URL (não expõe nada em link). */
var atribuicao = (function(){
  var a = null;
  try{ a = JSON.parse(ls(ATRIB)||'null'); }catch(e){}
  var q = {}, campos = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'], viu=false;
  try{
    var sp = new URLSearchParams(window.location.search);
    campos.forEach(function(k){ var v=sp.get(k); if(v){ q[k]=String(v).slice(0,120); viu=true; } });
  }catch(e){}
  var ref = '';
  try{ ref = document.referrer ? new URL(document.referrer).hostname : ''; }catch(e){}
  if(!a){ a = { first_touch:null, last_touch:null, first_referrer:ref, criado_em:new Date().toISOString() }; }
  if(viu){ if(!a.first_touch) a.first_touch = q; a.last_touch = q; }
  else if(!a.first_touch && ref){ a.first_touch = {utm_source:ref, utm_medium:'referral'}; a.last_touch = a.first_touch; }
  ls(ATRIB, JSON.stringify(a));
  return a;
})();
S.utm = atribuicao.last_touch || atribuicao.first_touch || null;

/* trackEvent — grava na fila local. Na Fase 2 a fila é drenada para o backend.
   Assinatura estável de propósito: nada muda no app quando o backend chegar. */
function trackEvent(nome, meta){
  try{
    var f = JSON.parse(ls(FILA)||'[]');
    f.push({ event_id: uuid(), player_id: playerId, event_name: nome,
             timestamp: new Date().toISOString(), session_id: sessionId,
             screen: 'etapa_'+S.etapa+(S.sub?'_'+S.sub:''),
             utm: S.utm||null, metadata: meta||{} });
    if(f.length>LIMITE_FILA) f = f.slice(-LIMITE_FILA);
    ls(FILA, JSON.stringify(f));
    try{ agendarSinc(); }catch(e){}
  }catch(e){ /* silêncio: telemetria nunca interrompe a experiência */ }
}

/* =====================================================================
   SINCRONIZAÇÃO — a fila local sobe para o backend.
   A fila continua sendo a fonte durante a partida; o banco é histórico.
   Nada aqui pode travar o jogo: falhou, os eventos ficam na fila e vão
   na próxima tentativa. Cada evento tem id próprio, então reenviar a
   mesma fila não duplica nada do outro lado.
   ===================================================================== */
var API='https://ncvispbuglalzubilvma.supabase.co/functions/v1/';
var SINC={rodando:false, tm:null, ultima:0};

function retratoJogador(){
  var a=atribuicao||{}, ft=a.first_touch||{}, lt=a.last_touch||{};
  return {
    player_id:playerId,
    nome:S.nome||null, email:S.email||null, whatsapp:S.tel||null,
    genero:S.genero||null,
    data_nascimento:S.data||null,
    hora_nascimento:(S.hora||'').slice(0,5)||null,
    hora_incerta:!!S.horaIncerta,
    cidade:S.cidade?S.cidade.nome:null, uf:S.cidade?S.cidade.uf:null,
    timezone:S.cidade?S.cidade.tz:null,
    current_stage:S.etapa||0,
    reflection_selected:S.reflexao||null,
    autorretrato_em: jaRegistrou('portrait_generated')? new Date().toISOString(): null,
    source: lt.utm_source||ft.utm_source||a.first_referrer||null,
    utm_source:lt.utm_source||null, utm_medium:lt.utm_medium||null,
    utm_campaign:lt.utm_campaign||null, utm_content:lt.utm_content||null, utm_term:lt.utm_term||null,
    first_touch:ft, last_touch:lt,
    consentimentos:{relatorio:!!S.okRelatorio, novidades:!!S.okNovidades, maior:!!S.maior},
    app_versao:VERSAO_APP
  };
}
function sincronizar(motivo){
  if(SINC.rodando) return Promise.resolve(false);
  if(!S.nome) return Promise.resolve(false);          /* antes do nome não há jogador */
  SINC.rodando=true;
  var fila=[];
  try{ fila=JSON.parse(ls(FILA)||'[]'); }catch(e){}
  var enviados=fila.map(function(e){return e.event_id;});
  return fetch(API+'ingestao',{
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({jogador:retratoJogador(), eventos:fila, motivo:motivo||''})
  }).then(function(r){ return r.ok?r.json():Promise.reject(r.status); })
    .then(function(){
      /* só apaga da fila o que foi confirmado; o que entrou no meio fica */
      try{
        var agora=JSON.parse(ls(FILA)||'[]');
        ls(FILA, JSON.stringify(agora.filter(function(e){return enviados.indexOf(e.event_id)<0;})));
      }catch(e){}
      SINC.ultima=Date.now(); SINC.rodando=false; return true;
    })
    .catch(function(){ SINC.rodando=false; return false; });  /* silêncio: tenta de novo depois */
}
/* sobe pouco depois de cada evento, agrupando o que veio junto */
function agendarSinc(){
  clearTimeout(SINC.tm);
  SINC.tm=setTimeout(function(){ sincronizar('fila'); }, 4000);
}
/* última chance quando a pessoa sai ou troca de aba */
try{
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState==='hidden') sincronizar('saida');
  });
}catch(e){}

function jaRegistrou(nome){
  try{ return JSON.parse(ls(FILA)||'[]').some(function(e){return e.event_name===nome;}); }catch(e){ return false; }
}
function trackUmaVez(nome, meta){ if(!jaRegistrou(nome)) trackEvent(nome, meta); }

/* =====================================================================
   DATA DE NASCIMENTO — dia / mês / ano
   Normaliza para YYYY-MM-DD ANTES de qualquer coisa. O motor não percebe
   diferença: calcular() e fusoTexto() continuam fazendo S.data.split('-').
   ===================================================================== */
var MESES=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
var ANO_MIN=1900;

function diasNoMes(m,a){ return [31,(a%4===0&&a%100!==0)||a%400===0?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; }

/* Retorna {ok:true, data:'YYYY-MM-DD'} ou {ok:false, erro:'...'} */
function validarData(dia,mes,ano){
  var d=parseInt(dia,10), m=parseInt(mes,10), a=parseInt(ano,10);
  if(!dia||!mes||!ano||isNaN(d)||isNaN(m)||isNaN(a)) return {ok:false,erro:'Preencha o dia, o mês e o ano.'};
  if(String(ano).replace(/\D/g,'').length!==4)      return {ok:false,erro:'O ano tem quatro dígitos. Ex.: 1984.'};
  if(m<1||m>12)                                      return {ok:false,erro:'Escolha o mês.'};
  var hoje=new Date(), anoMax=hoje.getFullYear();
  if(a<ANO_MIN||a>anoMax)                            return {ok:false,erro:'O ano precisa estar entre '+ANO_MIN+' e '+anoMax+'.'};
  var lim=diasNoMes(m,a);
  if(d<1||d>lim)                                     return {ok:false,erro:MESES[m-1]+' de '+a+' tem '+lim+' dias.'};
  var iso=a+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
  var hojeIso=hoje.getFullYear()+'-'+String(hoje.getMonth()+1).padStart(2,'0')+'-'+String(hoje.getDate()).padStart(2,'0');
  if(iso>hojeIso)                                    return {ok:false,erro:'Essa data ainda não aconteceu.'};
  return {ok:true,data:iso};
}
function partesData(){
  var m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S.data||'');
  return m?{dia:String(+m[3]),mes:String(+m[2]),ano:m[1]}:{dia:'',mes:'',ano:''};
}


/* =====================================================================
   MODO DE INSTRUÇÃO — camada de apresentação, sobre tudo.
   Só existe em quatro momentos. Nunca no Autorretrato (documento de
   consulta, vai para PDF). Falha em silêncio: se der erro, o texto
   aparece inteiro e o jogo segue.
   Ritmo calculado por número de palavras — Brysbaert (2019).
   ===================================================================== */

/* =====================================================================
   SOM — sintetizado, sem arquivo nenhum, desligado por padrão.
   Nada toca antes de um toque consciente: além de respeito, é regra de
   navegador. O contexto de áudio só é criado quando a pessoa liga.
   ===================================================================== */
var SOM_ON=false, AC=null, AMB=null, LOOPS={};
try{ SOM_ON = (ls('jc_som')==='1'); }catch(e){}
function ac(){
  if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ AC=null; } }
  if(AC && AC.state==='suspended'){ try{AC.resume();}catch(e){} }
  return AC;
}
function ambienteLiga(){
  var a=ac(); if(!a||AMB) return;
  try{
    var g=a.createGain(); g.gain.value=0; g.connect(a.destination);
    var f=a.createBiquadFilter(); f.type='lowpass'; f.frequency.value=300; f.connect(g);
    var o1=a.createOscillator(), o2=a.createOscillator();
    o1.type='sine'; o1.frequency.value=55; o2.type='sine'; o2.frequency.value=55.6;
    var go=a.createGain(); go.gain.value=.5; o1.connect(go); o2.connect(go); go.connect(f);
    var buf=a.createBuffer(1,a.sampleRate*3,a.sampleRate), d=buf.getChannelData(0), l=0, k;
    for(k=0;k<d.length;k++){ var w=Math.random()*2-1; l=(l+.018*w)/1.018; d[k]=l*3.2; }
    var n=a.createBufferSource(); n.buffer=buf; n.loop=true;
    var gn=a.createGain(); gn.gain.value=.05; n.connect(gn); gn.connect(f);
    o1.start(); o2.start(); n.start();
    g.gain.linearRampToValueAtTime(.045, a.currentTime+2.2);
    AMB=g;
  }catch(e){}
}
function ambienteDesliga(){ try{ if(AMB&&AC) AMB.gain.linearRampToValueAtTime(0, AC.currentTime+.5); }catch(e){} }
/* som(nome) — toques curtos e um loop discreto de digitação */
function som(nome){
  if(!SOM_ON) return; var a=ac(); if(!a) return;
  try{
    if(nome==='tecla'){
      if(LOOPS.tecla) return;
      var g=a.createGain(); g.gain.value=.02; g.connect(a.destination);
      var f=a.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2100; f.Q.value=1.4; f.connect(g);
      var buf=a.createBuffer(1,a.sampleRate,a.sampleRate), d=buf.getChannelData(0), k;
      for(k=0;k<d.length;k++) d[k]=(Math.random()*2-1)*(0.35+0.65*Math.abs(Math.sin(k/220)));
      var n=a.createBufferSource(); n.buffer=buf; n.loop=true; n.connect(f); n.start();
      LOOPS.tecla={n:n,g:g}; return;
    }
    var freq={porta:88, marca:660, passo:1180, fecho:523}[nome]||880;
    var dur ={porta:.75, marca:.5,  passo:.09, fecho:.4}[nome]||.1;
    var vol ={porta:.07, marca:.045,passo:.045,fecho:.035}[nome]||.04;
    var o=a.createOscillator(), gg=a.createGain();
    o.type='sine'; o.frequency.value=freq; o.connect(gg); gg.connect(a.destination);
    gg.gain.setValueAtTime(0,a.currentTime);
    gg.gain.linearRampToValueAtTime(vol,a.currentTime+.012);
    gg.gain.exponentialRampToValueAtTime(.0001,a.currentTime+dur);
    o.start(); o.stop(a.currentTime+dur+.05);
  }catch(e){}
}
function somPara(nome){ try{ var L=LOOPS[nome]; if(L){ L.n.stop(); L.g.disconnect(); LOOPS[nome]=null; } }catch(e){} }
function somAlterna(){
  SOM_ON=!SOM_ON; try{ ls('jc_som', SOM_ON?'1':'0'); }catch(e){}
  if(SOM_ON){ ambienteLiga(); som('passo'); trackEvent('sound_enabled'); }
  else { ambienteDesliga(); somPara('tecla'); trackEvent('sound_disabled'); }
  var b=document.querySelector('.i-som'); if(b){ b.textContent='Som: '+(SOM_ON?'on':'off'); b.setAttribute('aria-pressed',SOM_ON?'true':'false'); }
}

var REDUZ=false; try{REDUZ=matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(e){}
var VISTO='jc_instr_visto';

/* Velocidade de digitação. Digitar rápido demais é o mesmo que entregar o
   texto pronto: o olho não acompanha e a pessoa volta a esperar. Perto de
   30 caracteres por segundo dá para ler acompanhando — e é isso que faz o
   tempo sumir. O sistema digita mais devagar porque são poucas palavras
   e elas pesam. */
var CPS=17;      /* mais devagar de novo: perto da leitura confortável */
var CPS_SYS=14;
var ROTEIROS={
 abertura:{ ppm:[132,172], piso:850, decai:.86,
   b:[{t:'sys',x:'Sessão iniciada.',d:650},
      {t:'escolha'},
      {t:'marca',d:1100},
      {t:'voz',x:'Sete etapas. Cerca de oito minutos. No fim, o seu Autorretrato.',d:750},
      {t:'sys',x:'Identificação necessária.',d:600}] },
 instrucoes:{ ppm:[112,155], piso:1100, decai:.88,
   b:[{t:'sys',x:'Autorretrato concluído.',d:700},
      {t:'voz',x:'Você recebeu o mapa.',d:900},
      {t:'voz',x:'Mas um mapa não decide a próxima jogada.',d:800},
      {t:'voz',x:'Quem decide é quem está segurando ele.',d:1100},
      {t:'voz',x:'Antes de continuar, existe uma pergunta que você precisa carregar.',d:1600},
      {t:'voz',x:'Não é sobre o que falta em você.',d:1000},
      {t:'voz',x:'É sobre o que já passou pela sua mão sem você perceber que era uma peça.',d:1100},
      {t:'voz',x:'São doze minutos. Eles não te dão mais informação sobre você — você já tem informação demais sobre você.',d:700},
      {t:'voz',x:'Eles te mostram o que fazer com ela na segunda-feira de manhã.',d:1400}] }
};


/* A história do Autorretrato vira roteiro: título do movimento em dourado,
   depois os parágrafos, um a um. O mesmo texto continua existindo inteiro
   dentro da Ficha — lá ele é documento, aqui é travessia. */
function roteiroHistoria(){
  var dados=window.__DADOS_HIST; if(!dados) return null;
  var m=dados.mapa, tp=dados.tipologia;
  var mv=window.Narrativa.historia(dados), b=[], k;
  /* Um movimento por vez. Cada ato abre com o nome, mostra o que tem pra
     mostrar, e para — a pessoa segue quando quiser. Ninguém é arrastado. */
  /* as cartas já começam a ser buscadas aqui, enquanto a abertura roda */
  try{
    if(m && m.taro){ var _p1=new Image(); _p1.src=urlArcano(m.taro.numero); }
    if(tp && tp.tipo){ var _p2=new Image(); _p2.src=urlTipo(tp.tipo); }
  }catch(e){}
  b.push({t:'sys',x:'Autorretrato pronto.',d:700});
  b.push({t:'pausa'});
  for(k=0;k<mv.length;k++){
    b.push({t:'mov',x:mv[k].t,d:520});
    /* a carta entra no ato que fala dela; o tipo, no ato que fala dele */
    if(/carta/i.test(mv[k].t) && m && m.taro)
      b.push({t:'img',u:urlArcano(m.taro.numero),a:m.taro.arcano+' — '+m.taro.deus,d:900});
    if(/diz de você/i.test(mv[k].t) && tp && tp.tipo)
      b.push({t:'img',u:urlTipo(tp.tipo),a:'A sua carta de tipo — '+tp.tipo,d:900});
    b.push({t:'voz',x:mv[k].p[0],d:380});
    if(mv[k].p.length>1) b.push({t:'voz',x:mv[k].p[mv[k].p.length-1],d:520});
    b.push({t:'pausa'});
  }
  var f=window.Narrativa.fecho({entrada:{nome:S.nome}}).split('\n\n');
  b.push({t:'mov',x:'E agora?',d:600});
  b.push({t:'voz',x:f[0],d:420});
  b.push({t:'voz',x:f[f.length-1],d:700});
  return { ppm:[120,160], piso:900, decai:.97, janela:9, atos:true, b:b };
}

var INSTR={caixa:null,linhas:null,i:0,dig:null,tm:null,rodando:false,fim:null,rot:null,t0:0,nome:''};

function instrJaViu(nome){ try{ return (ls(VISTO)||'').indexOf('|'+nome+'|')>=0; }catch(e){ return false; } }
function instrMarca(nome){ try{ ls(VISTO,(ls(VISTO)||'')+'|'+nome+'|'); }catch(e){} }

function instrMonta(){
  if(INSTR.caixa) return;
  var d=document.createElement('div'); d.id='instr'; d.setAttribute('aria-live','polite');
  d.innerHTML=''+
   '<div class="i-topo">'+
     '<button type="button" class="i-som" aria-pressed="false">Som: off</button>'+
     '<button type="button" class="i-pular">Pular</button></div>'+
   '<div class="i-meio"><div class="i-linhas"></div></div>'+
   '<p class="i-rod">Toque para adiantar</p>';
  document.body.appendChild(d);
  INSTR.caixa=d; INSTR.linhas=d.querySelector('.i-linhas');
  /* O toque é escutado no overlay inteiro. Cliques em botão são ignorados,
     senão ligar o som ou pular também adiantaria a frase. */
  d.addEventListener('click', function(ev){
    var t=ev.target;
    while(t && t!==d){ if(t.tagName==='BUTTON'||t.tagName==='A') return; t=t.parentNode; }
    instrAdiantar();
  });
  var bs=d.querySelector('.i-som');
  bs.textContent='Som: '+(SOM_ON?'on':'off');
  bs.setAttribute('aria-pressed',SOM_ON?'true':'false');
  bs.onclick=function(e){e.stopPropagation();somAlterna();};
  d.querySelector('.i-pular').onclick=function(e){e.stopPropagation();
    var esc=INSTR.linhas.querySelector('.escolha:not(.respondido)');
    if(esc){ esc.classList.add('pisca'); setTimeout(function(){esc.classList.remove('pisca');},700); return; }
    instrEncerra('pulou');};
}
function instrLeitura(txt,k,rot){
  if(!txt) return rot.piso;
  var n=rot.b.length, prog=n>1?k/(n-1):1;
  var ppm=rot.ppm[0]+(rot.ppm[1]-rot.ppm[0])*prog;
  return Math.max(rot.piso, Math.round(txt.trim().split(/\s+/).length/ppm*60000));
}
function instrEnvelhece(){
  var ns=INSTR.linhas.querySelectorAll('.i-bl.on:not(.saindo)'), k;
  /* Em modo de atos a tela é limpa a cada Continuar, então o ato inteiro
     fica legível — escurecer o que veio antes atrapalharia reler. */
  if(!(INSTR.rot && INSTR.rot.atos))
    for(k=0;k<ns.length;k++) ns[k].classList.add('velho');
  /* Em modo de atos NÃO removemos bloco nenhum: a tela é limpa inteira a cada
     Continuar. Era essa poda que comia a carta antes de ela aparecer. */
  if(INSTR.rot && INSTR.rot.atos) return;
  var v=INSTR.linhas.querySelectorAll('.i-bl:not(.saindo)');
  for(k=0;k<v.length-3;k++)(function(el){el.classList.add('saindo');
    setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},700);})(v[k]);
}
function instrDigita(el,txt,cps,ok){
  /* Todos os caracteres entram de uma vez, invisíveis, e vão sendo revelados.
     A frase já nasce com a quebra de linha definitiva — nenhuma palavra pula
     de linha enquanto o texto aparece. Era esse reajuste que atrapalhava a
     leitura: o olho perdia a linha a cada palavra nova. */
  el.textContent='';
  var frag=document.createDocumentFragment(), spans=[], k, sp;
  for(k=0;k<txt.length;k++){
    sp=document.createElement('span'); sp.className='ch'; sp.textContent=txt.charAt(k);
    frag.appendChild(sp); spans.push(sp);
  }
  el.appendChild(frag);
  var cur=document.createElement('span'); cur.className='i-cur';
  el.appendChild(cur);           /* largura zero: não empurra nada */
  el.classList.add('on');
  var passo=Math.max(10, Math.round(1000/cps)), j=0;
  som('tecla');
  INSTR.dig=setInterval(function(){
    if(j<spans.length){ spans[j].classList.add('v');
      /* cursor colado no último caractere revelado */
      if(spans[j].nextSibling!==cur) el.insertBefore(cur, spans[j].nextSibling);
      j++; }
    if(j>=spans.length){ clearInterval(INSTR.dig); INSTR.dig=null; somPara('tecla');
      setTimeout(function(){ if(cur.parentNode)cur.parentNode.removeChild(cur); ok(); },260); }
  },passo);
  INSTR.revelarTudo=function(){
    for(var q=0;q<spans.length;q++) spans[q].classList.add('v');
    if(cur.parentNode) cur.parentNode.removeChild(cur);
  };
}
function instrProximo(){
  var rot=INSTR.rot;
  if(INSTR.i>=rot.b.length){ instrEncerra('completou'); return; }
  var b=rot.b[INSTR.i++];
  instrEnvelhece();
  /* bloco de escolha: a sequência para e espera a pessoa. Sem contagem, sem pressa. */
  if(b.t==='escolha'){
    var q=document.createElement('div'); q.className='i-bl escolha';
    q.innerHTML='<p class="e-perg">Como o jogo vai te chamar?</p>'+
      '<div class="e-ops">'+
        '<button type="button" data-g="m">Jogador</button>'+
        '<button type="button" data-g="f">Jogadora</button>'+
      '</div>'+
      '<button type="button" class="e-neutro" data-g="n">prefiro não dizer</button>';
    INSTR.linhas.appendChild(q);
    requestAnimationFrame(function(){q.classList.add('on');});
    Array.prototype.forEach.call(q.querySelectorAll('[data-g]'),function(bt){
      bt.onclick=function(ev){
        ev.stopPropagation();
        S.genero=bt.dataset.g; salvar();
        trackEvent('gender_selected',{valor:S.genero});
        q.classList.add('respondido');
        Array.prototype.forEach.call(q.querySelectorAll('[data-g]'),function(o){
          o.disabled=true; if(o!==bt) o.classList.add('apagado'); else o.classList.add('escolhido');});
        INSTR.tm=setTimeout(instrProximo, REDUZ?200:620);
      };});
    return;
  }
  /* imagem — a carta entra no meio da narração */
  if(b.t==='img'){
    if(!b.u){ instrProximo(); return; }
    var box=document.createElement('div'); box.className='i-bl foto';
    var im=new Image();
    im.alt=b.a||''; im.decoding='async';
    box.appendChild(im);
    INSTR.linhas.appendChild(box);
    requestAnimationFrame(function(){box.classList.add('on');});
    /* o ato não anda enquanto a carta não estiver na tela — mas também não
       trava: 4 segundos de teto e a história segue sem ela */
    var seguiu=false;
    function segue(atraso){ if(seguiu)return; seguiu=true;
      INSTR.tm=setTimeout(instrProximo, REDUZ?200:atraso); }
    im.onload=function(){ box.classList.add('ok'); segue(b.d||900); };
    im.onerror=function(){ if(box.parentNode) box.parentNode.removeChild(box); segue(120); };
    im.src=b.u;
    if(im.complete && im.naturalWidth){ box.classList.add('ok'); segue(b.d||900); }
    setTimeout(function(){ segue(200); }, 4000);
    return;
  }
  /* pausa — o ato termina e espera a pessoa */
  if(b.t==='pausa'){
    var pb=document.createElement('div'); pb.className='i-bl segue';
    pb.innerHTML='<button type="button" class="i-segue">Continuar</button>';
    INSTR.linhas.appendChild(pb);
    requestAnimationFrame(function(){pb.classList.add('on');});
    var rod=INSTR.caixa.querySelector('.i-rod'); if(rod) rod.textContent='';
    pb.querySelector('button').onclick=function(ev){
      ev.stopPropagation();
      som('passo');
      INSTR.linhas.innerHTML='';        /* o próximo ato começa em tela limpa */
      var r=INSTR.caixa.querySelector('.i-rod'); if(r) r.textContent='Toque para adiantar';
      if(INSTR.caixa) INSTR.caixa.querySelector('.i-meio').scrollTop=0;
      INSTR.tm=setTimeout(instrProximo, 260);
    };
    return;
  }
  /* título de movimento da história */
  if(b.t==='mov'){
    var mv=document.createElement('p'); mv.className='i-bl mov'; mv.textContent=b.x;
    INSTR.linhas.appendChild(mv);
    requestAnimationFrame(function(){mv.classList.add('on');});
    som('marca');
    INSTR.tm=setTimeout(instrProximo, REDUZ?200:(b.d||700));
    return;
  }
  /* bloco de marca: o título do jogo assume a forma escolhida */
  if(b.t==='marca'){
    var mk=document.createElement('div'); mk.className='i-bl marca';
    mk.innerHTML='<span class="m-cat">RPG</span><b class="m-nome">'+esc(MARCA())+'</b>';
    som('marca');
    INSTR.linhas.appendChild(mk);
    requestAnimationFrame(function(){mk.classList.add('on');});
    INSTR.tm=setTimeout(instrProximo, REDUZ?300:(b.d||1100)+700);
    return;
  }
  var el=document.createElement('p'); el.className='i-bl '+b.t; INSTR.linhas.appendChild(el);
  if(REDUZ){ el.textContent=b.x; el.classList.add('on'); INSTR.tm=setTimeout(instrProximo,300); return; }
  /* Tudo digita. A leitura acontece DURANTE a digitação, então não existe mais
     pausa de leitura separada — só uma batida curta entre um bloco e outro.
     Fica mais rápido e mais envolvente ao mesmo tempo: quem lê acompanhando
     não sente o tempo passar. */
  var D=Math.max(220,Math.round((b.d||700)*Math.pow(rot.decai,INSTR.i-1)));
  instrDigita(el, b.x, b.t==='sys'?CPS_SYS:CPS, function(){ INSTR.tm=setTimeout(instrProximo, D); });
}
function instrAdiantar(){
  if(!INSTR.rodando) return;
  /* na tela de escolha, tocar na tela não avança: a resposta é da pessoa */
  if(INSTR.linhas.querySelector('.escolha:not(.respondido)')) return;
  if(INSTR.linhas.querySelector('.segue')) return;   /* o ato acabou: quem segue é a pessoa */
  if(INSTR.dig){ clearInterval(INSTR.dig); INSTR.dig=null;
    if(INSTR.revelarTudo) INSTR.revelarTudo();
    somPara('tecla'); clearTimeout(INSTR.tm); INSTR.tm=setTimeout(instrProximo,200); return; }
  clearTimeout(INSTR.tm); instrProximo();
}
function instrEncerra(como){
  clearTimeout(INSTR.tm); if(INSTR.dig){clearInterval(INSTR.dig);INSTR.dig=null;}
  INSTR.rodando=false;
  trackEvent(como==='pulou'?'instruction_skipped':'instruction_completed',
    {roteiro:INSTR.nome, duracao_ms:Date.now()-INSTR.t0, blocos_vistos:INSTR.i});
  instrMarca(INSTR.nome);
  /* A tela seguinte é montada ATRÁS do escuro, e só então o escuro se dissolve.
     Fazer o contrário mostrava o cartaz por um instante — parecia que o jogo
     voltava para o início antes de ir para a pergunta. */
  somPara('tecla'); som('fecho');
  var f=INSTR.fim; INSTR.fim=null;
  if(f){ try{ f(); }catch(e){} }
  requestAnimationFrame(function(){
    INSTR.caixa.classList.remove('on');
    document.body.removeAttribute('data-instr');
    setTimeout(function(){ INSTR.linhas.innerHTML=''; },600);
  });
}
/* roda(nome, aoTerminar) — se já viu, chama direto e não repete o efeito */
function instrRoda(nome, aoTerminar, rotDireto){
  var rot=rotDireto||ROTEIROS[nome];
  if(!rot || instrJaViu(nome)){
    /* Já viu uma vez: não repete o efeito, mas também não dá um corte seco —
       um escurecer curto mantém a sensação de atravessar. */
    try{
      instrMonta(); INSTR.linhas.innerHTML='';
      document.body.setAttribute('data-instr','1');
      INSTR.caixa.classList.add('on');
      setTimeout(function(){
        try{ aoTerminar(); }catch(e){}
        requestAnimationFrame(function(){
          INSTR.caixa.classList.remove('on');
          document.body.removeAttribute('data-instr');
        });
      }, 420);
    }catch(e){ aoTerminar(); }
    return;
  }
  try{
    instrMonta();
    INSTR.rot=rot; INSTR.nome=nome; INSTR.i=0; INSTR.fim=aoTerminar;
    INSTR.rodando=true; INSTR.t0=Date.now();
    INSTR.linhas.innerHTML='';
    document.body.setAttribute('data-instr','1');
    INSTR.caixa.classList.add('on');
    trackEvent('instruction_mode_started',{roteiro:nome});
    if(SOM_ON){ ambienteLiga(); som('porta'); }
    INSTR.tm=setTimeout(instrProximo, REDUZ?150:850);
  }catch(e){ aoTerminar(); }
}


/* =====================================================================
   FLEXÃO — o jogo fala com quem está jogando.
   O português obriga a escolher gênero em quase toda frase sobre a pessoa.
   Em vez de assumir masculino, o jogo pergunta como quer ser chamado.
   'n' (não quis dizer) usa formas sem marca sempre que a língua deixa.
   O motor de cálculo NÃO é tocado: a flexão acontece só na apresentação.
   ===================================================================== */
function G(m,f,n){
  if(S.genero==='f') return f;
  if(S.genero==='n') return (n===undefined?m:n);
  return m;
}
var FLEX_F={
  'Projetor':'Projetora','Gerador':'Geradora','Gerador Manifestante':'Geradora Manifestante',
  'Manifestador':'Manifestadora','Refletor':'Refletora',
  'Investigador':'Investigadora','Ermitão':'Ermitã',
  'Mártir':'Mártir','Oportunista':'Oportunista','Herege':'Herege','Modelo':'Modelo'
};
/* flex('Projetor') -> 'Projetora' quando for o caso. Aceita composto com barra. */
function flex(t){
  if(!t||S.genero!=='f') return t;
  return String(t).split(' / ').map(function(x){
    var y=x.trim(); return FLEX_F[y]||y;
  }).join(' / ');
}
function MARCA(){ return G('O Jogador Consciente','A Jogadora Consciente','Jogador Consciente'); }
function JOGADOR(){ return G('Jogador','Jogadora','Jogador'); }
function DO_JOGADOR(){ return G('do Jogador','da Jogadora','do Jogador'); }
try{ window.GEN={G:G,flex:flex,MARCA:MARCA,JOGADOR:JOGADOR,DO_JOGADOR:DO_JOGADOR}; }catch(e){}


/* =====================================================================
   CARTAS — 22 arcanos e 32 tipos, hospedados no Storage do Supabase.
   O jogo NUNCA baixa as 54: cada jogador recebe duas, o arcano dele e o
   tipo dele, carregadas sob demanda. Se a imagem falhar — rede ruim,
   arquivo fora do ar — a carta tipográfica continua no lugar e ninguém
   vê buraco. Imagem aqui é acabamento, nunca requisito.
   ===================================================================== */
var CARTAS_BASE='https://ncvispbuglalzubilvma.supabase.co/storage/v1/object/public/assets/';
var ARQ_ARCANO={
  0:'rpg_ojc_arcano_00_o_louco.webp',
  1:'rpg_ojc_arcano_01_o_mago.webp',
  2:'rpg_ojc_arcano_02_a_sacerdotisa.webp',
  3:'rpg_ojc_arcano_03_a_imperatriz.webp',
  4:'rpg_ojc_arcano_04_o_imperador.webp',
  5:'rpg_ojc_arcano_05_o_hierofante.webp',
  6:'rpg_ojc_arcano_06_os_enamorados.webp',
  7:'rpg_ojc_arcano_07_o_carro.webp',
  8:'rpg_ojc_arcano_08_a_justica.webp',
  9:'rpg_ojc_arcano_09_o_eremita.webp',
  10:'rpg_ojc_arcano_10_a_roda_da_fortuna.webp',
  11:'rpg_ojc_arcano_11_a_forca.webp',
  12:'rpg_ojc_arcano_12_o_enforcado.webp',
  13:'rpg_ojc_arcano_13_a_morte.webp',
  14:'rpg_ojc_arcano_14_a_temperanca.webp',
  15:'rpg_ojc_arcano_15_o_diabo.webp',
  16:'rpg_ojc_arcano_16_a_torre.webp',
  17:'rpg_ojc_arcano_17_a_estrela.webp',
  18:'rpg_ojc_arcano_18_a_lua.webp',
  19:'rpg_ojc_arcano_19_o_sol.webp',
  20:'rpg_ojc_arcano_20_o_julgamento.webp',
  21:'rpg_ojc_arcano_21_o_mundo.webp'
};
function urlArcano(n){ var f=ARQ_ARCANO[n]; return f?CARTAS_BASE+'cartas/'+f:''; }
function urlTipo(codigo){
  if(!codigo) return '';
  var g = (S.genero==='f') ? 'f' : 'm';   /* sem escolha, masculino como não-marcado */
  return CARTAS_BASE+'tipos/rpg_ojc_tipo_'+String(codigo).toLowerCase()+'_'+g+'.webp';
}
/* <img> que se apaga sozinha se não carregar */
function imgCarta(url, alt, cls){
  if(!url) return '';
  return '<img class="'+(cls||'carta-img')+'" src="'+url+'" alt="'+esc(alt||'')+'" '+
         'loading="eager" decoding="async" '+
         'onload="this.classList.add(\'ok\')" '+
         'onerror="this.remove()">';
}

var ETAPAS=['A chegada','A sua carta','O céu daquele dia','Como você se vê','Onde te encontro','O Autorretrato','Instruções Iniciais'];
/* =====================================================================
   ALTURA DA JANELA — medida UMA vez, em pixels, e limitada.
   Construtores de site (Hostinger, Wix, Elementor e afins) colocam HTML
   colado dentro de um quadro que se ajusta à altura do conteúdo. Se o
   conteúdo usa 100vh, ele mede a altura DESSE quadro: o quadro cresce,
   o conteúdo cresce junto, e a página estica sem fim.
   Fixar em px quebra esse ciclo. Só recalcula ao girar o aparelho.
   ===================================================================== */
var EMBUTIDO=false; try{ EMBUTIDO = (window.self!==window.top); }catch(e){ EMBUTIDO=true; }
function alturaJanela(){
  var h;
  if(EMBUTIDO){
    /* Dentro de um bloco de HTML de construtor de site, a altura da janela É a
       altura do próprio bloco — e ela muda conforme o conteúdo. Medir isso faz
       o layout oscilar (ora pequeno, ora grande) e pode esticar sem fim.
       Aqui a altura é uma constante de projeto: o conteúdo manda, não a moldura. */
    h=640;
  } else {
    try{ h=window.innerHeight||0; }catch(e){ h=0; }
    if(!h) h=640;
    h=Math.max(480, Math.min(h, 1200));
  }
  try{ document.documentElement.style.setProperty('--vph', h+'px'); }catch(e){}
  return h;
}
alturaJanela();
/* Em página própria vale reagir à barra do navegador que some ao rolar.
   Embutido, nunca: qualquer nova medida realimenta a moldura. */
if(!EMBUTIDO){ try{
  var gt=null, ultima=window.innerHeight;
  window.addEventListener('resize', function(){
    if(Math.abs(window.innerHeight-ultima)<80) return;   /* ignora o teclado abrindo */
    ultima=window.innerHeight; clearTimeout(gt); gt=setTimeout(alturaJanela,250);
  });
}catch(e){} }

var app=document.getElementById('app');

function calcular(){
  if(!S.data) return null;
  var d=S.data.split('-').map(Number), h=(S.hora||'12:00').split(':').map(Number);
  var c=S.cidade||{tz:'America/Sao_Paulo',lat:-23.5505,lon:-46.6333};
  return O.mapaCompleto({nome:S.nome||'Jogador',ano:d[0],mes:d[1],dia:d[2],hora:h[0],minuto:h[1],tz:c.tz,lat:c.lat,lon:c.lon});
}
function divergencias(hd,bf){
  var ab=function(c){return hd.centrosAbertos.indexOf(c)>=0;},df=function(c){return hd.centrosDefinidos.indexOf(c)>=0;},
      p=function(f){return bf[f].percentual;},out=[];
  if(ab('Garganta')&&p('E')>=60)out.push(['Garganta aberta, voz alta','A Garganta é onde você mais absorve o jeito dos outros falarem — e você se descreveu como quem puxa conversa e ocupa espaço.','Em que ambiente a sua voz muda mais — e com quem ela fica parecida?']);
  if(df('PlexoSolar')&&p('C')>=60)out.push(['Autoridade emocional, decisão rápida','Seu desenho pede tempo antes de decidir. Você se descreveu como quem resolve logo de cara.','Quantas das suas decisões rápidas você reviu depois — e quanto custou cada revisão?']);
  if(hd.tipo==='Projetor'&&p('E')>=60)out.push(['Desenho de convite, hábito de iniciar','Seu desenho funciona quando o convite vem antes da ação.'+' Você se descreveu como quem inicia.','Quando você começa sem ser chamado, como as pessoas costumam receber?']);
  if((hd.tipo==='Gerador'||hd.tipo==='Gerador Manifestante')&&p('E')<=40)out.push(['Energia disponível, presença recolhida','Você tem energia sacral pra gastar todo dia e se descreveu como reservado.','Onde essa energia está indo que ninguém vê?']);
  if(ab('Baco')&&p('N')>=60)out.push(['Baço aberto, alerta ligado','O Baço aberto amplifica o medo do ambiente. Você se descreveu como quem se abala com facilidade.','Do medo que você sentiu esta semana, quanto era seu?']);
  if(ab('Coracao')&&p('C')>=60)out.push(['Coração aberto, régua alta','O Coração aberto é o centro da prova de valor. Você se descreveu como muito exigente consigo.','Pra quem, exatamente, você está provando?']);
  if(ab('Ajna')&&p('O')>=60)out.push(['Ajna aberta, cabeça cheia','A Ajna aberta não fixa certeza — ela circula. Você se descreveu como cheio de ideias.','Das ideias deste mês, quantas viraram alguma coisa?']);
  if(ab('Sacral')&&p('C')>=60)out.push(['Sacral aberto, ritmo de quem tem','Sem Sacral definido você não tem energia constante — e se descreveu como quem mantém rotina e ordem.','Em que dia da semana você desaba, e o que você faz na véspera?']);
  return out.slice(0,3);
}
function convergencias(hd,bf){
  var df=function(c){return hd.centrosDefinidos.indexOf(c)>=0;},p=function(f){return bf[f].percentual;},o=[];
  if(df('Garganta')&&p('E')>=55)o.push('Garganta definida e você se descreve comunicativo — aqui o mapa e você contam a mesma história.');
  if(df('Baco')&&p('N')<=45)o.push('Baço definido e baixa reatividade — o seu instinto tem chão próprio.');
  if((hd.tipo==='Gerador'||hd.tipo==='Gerador Manifestante')&&p('E')>=55)o.push('Energia sacral e presença extrovertida caminham juntas no seu caso.');
  if(df('Ajna')&&p('O')>=55)o.push('Ajna definida com abertura alta — você fixa ideia e ainda busca ideia nova.');
  return o.slice(0,2);
}
function ir(e,sub){S.etapa=e;S.sub=sub||0;salvar();render();window.scrollTo(0,0);}
function barra(){if(!S.etapa)return'';
  return '<div class="prog"><div class="prog-t"><span>Etapa '+S.etapa+' de 7</span><b>'+ETAPAS[S.etapa-1]+'</b></div>'+
  '<div class="prog-b">'+ETAPAS.map(function(_,i){return '<i class="'+(i+1<S.etapa?'ok':i+1===S.etapa?'now':'')+'"></i>';}).join('')+'</div></div>';}
function tela(c,cls){return '<div class="tela '+(cls||'')+'">'+c+'</div>';}
function pnome(){return (S.nome||'').trim().split(/\s+/)[0];}

function T0(){return tela(
 '<div class="cartaz">'+
   '<div class="c-tit">'+
     '<span class="c-cat">RPG</span>'+
     '<b class="c-nome">'+G('O Jogador<br>Consciente','A Jogadora<br>Consciente','Jogador<br>Consciente')+'</b>'+
     '<span class="c-risco"></span>'+
     '<span class="c-sub">O jogo da sua vida profissional</span>'+
   '</div>'+
   '<div class="c-acao">'+
     '<button class="c-go" id="b-iniciar">Iniciar</button>'+
     '<details class="c-gl"><summary>Espera — o que é um RPG?</summary>'+
     '<p>Jogo de interpretação de papéis. Em vez de assistir a uma história, você joga dentro dela: tem um personagem, um mapa, itens, fases e escolhas que mudam o que acontece depois.</p>'+
     '<p>Aqui o personagem é você. É um jogo de <b>mundo aberto</b> — as fases não são vencidas na tela do celular, são vividas na rua, no trabalho, nas conversas. Você traz o que aconteceu de volta pro jogo, e é isso que abre a próxima porta.</p>'+
     '<p>Esta partida entra por um campo específico: o do trabalho, do dinheiro e da sua expressão profissional.</p></details>'+
   '</div>'+
   '<p class="c-rod">Você teria oito minutos para dedicar a você?<br><span>É de graça.</span></p>'+
 '</div>','cartaz-tela');}

/* Etapa 1 em dois tempos: nome, depois data. A barra continua dizendo 1 de 7. */
function T1(){
 if(S.sub===0) return tela('<div class="miolo">'+
   '<h2>Quem está entrando?</h2>'+
   '<label class="campo"><span>'+G('Como você quer ser chamado','Como você quer ser chamada','Como você quer ser chamado')+'</span>'+
     '<input id="i-nome" value="'+esc(S.nome)+'" placeholder="o nome que você usa" autocomplete="name"></label>'+
   '<button class="go" id="b1a">Continuar</button>'+
   '<p class="fine" id="nomeerr"></p>'+
 '</div>');
 var pd=partesData();
 return tela('<div class="miolo">'+
   '<h2>Quando você chegou?</h2>'+
   '<div class="campo"><span>Data de nascimento</span>'+
     '<div class="dma">'+
       '<label><i>Dia</i><input id="i-dia" inputmode="numeric" pattern="[0-9]*" maxlength="2" autocomplete="bday-day" placeholder="22" value="'+esc(pd.dia)+'"></label>'+
       '<label><i>Mês</i><select id="i-mes" autocomplete="bday-month"><option value="">—</option>'+
         MESES.map(function(n,k){return '<option value="'+(k+1)+'"'+(pd.mes==String(k+1)?' selected':'')+'>'+n+'</option>';}).join('')+
       '</select></label>'+
       '<label><i>Ano</i><input id="i-ano" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="bday-year" placeholder="1984" value="'+esc(pd.ano)+'"></label>'+
     '</div>'+
   '</div>'+
   '<button class="go" id="b1b">Continuar</button>'+
   '<p class="fine" id="dataerr">Ex.: 22 de julho de 1984.</p>'+
   '<button class="ghost" id="b1v">Voltar</button>'+
 '</div>');}

function T2(){var m=calcular();if(!m)return T1();
 return tela('<div class="miolo"><p class="eyebrow">Sua carta</p>'+
 '<div class="carta com-img">'+
   imgCarta(urlArcano(m.taro.numero), m.taro.arcano+' — '+m.taro.deus)+
   '<div class="carta-txt">'+
     '<div class="carta-n">'+m.taro.numero+'</div><h1 class="carta-t">'+esc(m.taro.arcano)+'</h1>'+
     '<p class="carta-d">'+esc(m.taro.deus)+'</p>'+
   '</div>'+
 '</div>'+
 '<p class="lede">'+esc(pnome())+', esta é a única parte do seu retrato que a data sozinha já entrega inteira. Não depende da hora, não depende do lugar. Todo o resto depende — e é por isso que ainda faltam perguntas.</p>'+
 '<button class="go" data-ir="3">Continuar</button><p class="fine"></p></div>');}

function T3(){return tela('<div class="miolo"><h2>O céu daquele dia</h2>'+
 '<p class="lede">A hora decide mais do que parece. Medimos em 368 nascimentos: sem ela, o seu Tipo sai errado em <b>1 a cada 4 pessoas</b> e o Ascendente simplesmente não existe.</p>'+
 '<p class="lede">Por isso preferimos perguntar a chutar.</p>'+
 '<label class="f"><span>Hora de nascimento</span><input id="i-hora" type="time" value="'+esc(S.hora)+'"></label>'+
 '<label class="chk"><input type="checkbox" id="i-inc"'+(S.horaIncerta?' checked':'')+'><span>Não tenho certeza da hora exata</span></label>'+
 '<p class="fine">Marcando isso, o jogo não vai falar do que depende da hora. Preferimos calar a inventar.</p>'+
 '<label class="f ac"><span>Cidade de nascimento</span><input id="i-cid" autocomplete="off" value="'+esc(S.cidade?S.cidade.nome+' — '+S.cidade.uf:'')+'"><div class="aclist" id="acl" hidden></div></label>'+
 '<p class="fine" id="tzf">'+(S.cidade?fusoTexto():'Escolha a cidade na lista — é ela que define o fuso.')+'</p>'+
 '<button class="go" id="b3">Continuar</button><p class="fine"></p></div>');}

function fusoTexto(){
 if(!S.cidade||!S.data)return'';
 var d=S.data.split('-').map(Number),h=(S.hora||'12:00').split(':').map(Number);
 var utc=O.localParaUTC({ano:d[0],mes:d[1],dia:d[2],hora:h[0],minuto:h[1],tz:S.cidade.tz});
 function o(x){var s=new Intl.DateTimeFormat('en',{timeZone:S.cidade.tz,timeZoneName:'longOffset'}).formatToParts(x)
   .filter(function(p){return p.type==='timeZoneName';})[0].value;var m=s.match(/GMT([+-])(\d{2}):(\d{2})/);
   return m?(m[1]==='-'?-1:1)*(+m[2]*60+ +m[3]):0;}
 var off=new Intl.DateTimeFormat('pt-BR',{timeZone:S.cidade.tz,timeZoneName:'longOffset'}).formatToParts(utc)
   .filter(function(p){return p.type==='timeZoneName';})[0].value.replace('GMT','UTC');
 var jan=new Date(Date.UTC(d[0],0,1)),jul=new Date(Date.UTC(d[0],6,1));
 return S.cidade.tz.replace(/^[^/]+\//,'').replace(/_/g,' ')+' · '+off+(o(utc)>Math.min(o(jan),o(jul))?' · horário de verão ativo nessa data':'');}

function T4(){var por=4,bl=Math.ceil(ITENS.length/por),b=S.sub,lote=ITENS.slice(b*por,(b+1)*por);
 return tela('<h2>Como você se vê</h2>'+
 '<p class="lede">Tudo até aqui veio do céu. Estas vêm de você — é o único lugar do autorretrato onde a sua voz entra. Responde sem pensar muito: a primeira resposta costuma ser a verdadeira.</p>'+
 '<p class="fine">1 = discordo · 5 = concordo · bloco '+(b+1)+' de '+bl+'</p>'+
 lote.map(function(it){return '<div class="q"><p>'+esc(it.t)+'</p><div class="lk">'+
   [1,2,3,4,5].map(function(v){return '<button data-q="'+it.id+'" data-v="'+v+'" class="'+(S.resp[it.id]===v?'on':'')+'">'+v+'</button>';}).join('')+
   '</div></div>';}).join('')+
 '<button class="go" id="b4">'+(b+1<bl?'Próximo bloco':'Continuar')+'</button>'+(b>0?'<button class="ghost" id="b4v">Voltar</button>':''));}

function T5(){return tela('<div class="miolo m-alto"><h2>Pra onde eu mando?</h2>'+
 '<p class="lede">O seu Autorretrato está pronto. Deixa onde eu te encontro — é por ali que as suas Instruções Iniciais chegam quando entrarem no ar.</p>'+
 '<label class="f"><span>E-mail</span><input id="i-mail" type="email" value="'+esc(S.email)+'"></label>'+
 '<label class="f"><span>WhatsApp (opcional)</span><input id="i-tel" value="'+esc(S.tel)+'" placeholder="(00) 00000-0000"></label>'+
 '<div class="cons">'+
 '<label class="chk"><input type="checkbox" id="c-rel"'+(S.okRelatorio?' checked':'')+'><span>Autorizo o contato por e-mail para receber o meu Autorretrato e as Instruções Iniciais. <i>Necessário para continuar.</i></span></label>'+
 '<label class="chk"><input type="checkbox" id="c-nov"'+(S.okNovidades?' checked':'')+'><span>Quero receber conteúdos e novidades do '+MARCA()+'. <i>Opcional — dá pra cancelar em um clique, em qualquer e-mail.</i></span></label>'+
 '<label class="chk"><input type="checkbox" id="c-mai"'+(S.maior?' checked':'')+'><span>Confirmo que tenho 18 anos ou mais.</span></label>'+
 '</div>'+
 '<p class="fine">O seu Autorretrato fica guardado com o seu e-mail — você pode pedir que eu mande de volta quando quiser, e pode salvar o PDF na hora. Os seus dados ficam com você e comigo, e com mais ninguém. Nada é publicado, nada é vendido, nada é compartilhado. Você pode pedir a exclusão de tudo a qualquer momento.</p>'+
 '<button class="go" id="b5">Ver o meu Autorretrato</button><p class="fine"></p></div>');}

function T6(){
 var m=calcular();if(!m)return T1();
 var hd=m.desenhoHumano,bf=O.bigFive(S.resp),tp=O.tipologia4Letras(bf),inc=S.horaIncerta;
 var dv=divergencias(hd,bf),cv=convergencias(hd,bf);
 var d=S.data.split('-').map(Number),h=(S.hora||'12:00').split(':').map(Number);
 var dadosHist={mapa:m,bigFive:bf,tipologia:tp,horaIncerta:inc,divergencias:dv,
   entrada:{nome:S.nome,ano:d[0],mes:d[1],dia:d[2],hora:h[0],minuto:h[1],cidade:S.cidade?S.cidade.nome+' ('+S.cidade.uf+')':'—'}};
 window.__DADOS_HIST=dadosHist;
 var hist=window.Narrativa.historia(dadosHist);
 var agora=new Date();
 var carimbo=String(agora.getDate()).padStart(2,'0')+'/'+String(agora.getMonth()+1).padStart(2,'0')+'/'+agora.getFullYear()+
   ' às '+String(agora.getHours()).padStart(2,'0')+'h'+String(agora.getMinutes()).padStart(2,'0');

 var dif=(function(){
   var d=S.data.split('-').map(Number),hh=(S.hora||'12:00').split(':').map(Number),c=S.cidade||{tz:'America/Sao_Paulo',lat:-23.55,lon:-46.63};
   var si=O.mapaCompleto({nome:'x',ano:d[0],mes:d[1],dia:d[2],hora:hh[0],minuto:hh[1],tz:c.tz,lat:c.lat,lon:c.lon,sistemaCasas:'signo-inteiro'});
   var n=0,tot=0,ex=[];
   for(var k in m.astral.planetas){ if(k==='NodoSul')continue; tot++;
     if(si.astral.planetas[k] && si.astral.planetas[k].casa!==m.astral.planetas[k].casa){ n++;
       if(ex.length<3) ex.push(k+' iria da casa '+m.astral.planetas[k].casa+' para a '+si.astral.planetas[k].casa); } }
   return {n:n,tot:tot,exemplos:ex};
 })();
 function corpo(k,rot){var v=m.astral.planetas[k];if(!v)return'';
   var casa=v.naSoleira?('casas '+v.entre[0]+' / '+v.entre[1]):('casa '+v.casa);
   var area=v.naSoleira?(window.CASA_CURTA(v.entre[0])+' — ou '+window.CASA_CURTA(v.entre[1])):window.CASA_CURTA(v.casa);
   return '<div class="terr"><span>'+rot+'</span><b>'+v.signo+'</b><i>'+casa+'</i><u>'+area+'</u></div>';}
 var terr=inc
   ? '<div class="tri">'+corpo('Sol','Sol')+'</div><p class="fine dim">Lua e Ascendente dependem da hora exata. Você marcou que não tem certeza — então o jogo não afirma nenhum dos dois.</p>'
   : '<div class="tri">'+corpo('Sol','Sol')+corpo('Lua','Lua')+
     '<div class="terr"><span>Ascendente</span><b>'+m.astral.ascendente.signo+'</b><i>casa 1</i><u>'+window.CASA_CURTA(1)+'</u></div></div>'+
     '<details class="gl"><summary>O Ascendente tem casa? Tem: a 1 — e ele é o começo dela.</summary>'+
     '<p>O Ascendente é o grau do zodíaco que estava subindo no horizonte leste no minuto exato do seu nascimento. Ele não fica <i>dentro</i> de uma casa: ele <b>abre</b> a casa 1, e é a partir dele que as outras onze são desenhadas em sequência.</p>'+
     '<p>Então a área dele é a área da casa 1: <b>'+window.CASA_CURTA(1)+'</b>. Na prática — como você chega numa sala antes de abrir a boca, e o que as pessoas percebem de você antes de te conhecerem. Por isso ele costuma ser descrito como a porta de entrada, e por isso é o ponto que mais depende da hora exata: ele anda um grau a cada quatro minutos.</p></details>'+
     '<details class="gl"><summary>O que são as doze casas — e o que cada uma cobre</summary>'+
     '<p>Se o signo diz <i>de que jeito</i> uma energia se expressa, a casa diz <b>em que área da sua vida</b> isso acontece. O céu inteiro é dividido em doze fatias a partir do seu Ascendente, e cada fatia é um território.</p>'+
     '<ul class="casas">'+[1,2,3,4,5,6,7,8,9,10,11,12].map(function(i){
        return '<li><b>'+window.CASAS[i].n.replace('Casa '+i+' — ','')+'</b><span>'+window.CASAS[i].a+'</span><em>'+i+'</em></li>';}).join('')+'</ul>'+
     '</details>'+
     '<details class="gl"><summary>Aviso honesto: a casa é a parte mais contestada da astrologia</summary>'+
     '<p>Existem mais de dez métodos de dividir o céu em casas — Placidus, Signo Inteiro, Koch, Campanus, Regiomontanus, Casas Iguais, e outros. Eles <b>discordam entre si</b>, e a escolha depende da linhagem e do estilo do astrólogo, não de uma prova.</p>'+
     '<p>No seu caso isso não é teoria: usei Placidus, o mais comum no ocidente hoje. Se eu tivesse usado Signo Inteiro, que é o sistema mais antigo, <b>'+dif.n+' dos '+dif.tot+' corpos do seu mapa mudariam de casa</b>'+(dif.exemplos.length?' — '+dif.exemplos.join(', '):'')+'.</p>'+
     '<p>Por isso a casa entra aqui como <i>lente</i>, não como sentença. O signo e o portão são cálculo fechado; a casa é leitura. Onde a leitura muda conforme quem lê, quem decide é você.</p></details>';

 var V=hd.variaveis;
 var motAb=['Sacral','Coracao','Raiz','PlexoSolar'].filter(function(c){return hd.centrosAbertos.indexOf(c)>=0;});

 var cab='<p class="eyebrow">RPG · '+MARCA()+'</p>'+
 '<h1 class="capa">O Autorretrato de<br>'+esc(S.nome)+'</h1>';
 var parte1='<p class="fine">Gerado em '+carimbo+' · a partir de '+String(d[2]).padStart(2,'0')+'/'+String(d[1]).padStart(2,'0')+'/'+d[0]+
   (inc?' (hora não confirmada)':' às '+String(h[0]).padStart(2,'0')+'h'+String(h[1]).padStart(2,'0'))+
   ' · '+(S.cidade?esc(S.cidade.nome+' — '+S.cidade.uf):'')+'</p>'+
 '<p class="lede">Um documento só, não seis ferramentas separadas. E é uma fotografia de <b>agora</b> — não uma sentença. Tudo aqui muda quando você muda; é disso que o jogo trata.</p>'+

 /* --- a história --- */
 '<div class="hist">'+hist.map(function(mv){
   return '<section class="mv"><h4>'+esc(mv.t)+'</h4>'+mv.p.map(function(x){return '<p>'+esc(x)+'</p>';}).join('')+'</section>';
 }).join('')+'</div>'+

'';
 var parte2 = '<p class="eyebrow">RPG · '+MARCA()+' · em tópicos</p>'+
 '<h2>O mesmo retrato, destrinchado</h2>'+
 '<p class="lede">A história acima em partes separadas — pra você voltar e consultar quando quiser.</p>'+
 '<p class="ps"><b>P.S.</b> — É provável que apareçam dúvidas agora. Deixa elas aparecerem. Não corre atrás de resposta ainda — anota a que mais incomodar. Elas são respondidas na próxima etapa.</p>'+

 (inc?'<p class="fine dim">Sem hora exata, o que vem abaixo é a leitura mais provável, não um veredito.</p>':'')+

 '<div class="bloco"><h3>Ficha do avatar</h3>'+
 '<p class="lede">Tudo o que o mapa entrega, do jeito que fica registrado no jogo — é daqui que os Guardiões vão puxar ao longo dos portais.</p>'+
 '<div class="kv">'+
 '<dt>Tipo áurico</dt><dd>'+esc(flex(hd.tipo))+'</dd>'+
 '<dt>Estratégia</dt><dd>'+esc(hd.estrategia)+'</dd>'+
 '<dt>Autoridade interna</dt><dd>'+esc(hd.autoridade)+'</dd>'+
 '<dt>Perfil</dt><dd>'+hd.perfil+' — '+esc(flex(hd.perfilNome))+'</dd>'+
 '<dt>Definição</dt><dd>'+esc(hd.definicao)+'</dd>'+
 (hd.assinaturaEnergetica?'<dt>Assinatura energética</dt><dd>'+esc(hd.assinaturaEnergetica)+'</dd>':'')+
 (hd.temaEmocional?'<dt>Tema emocional</dt><dd>'+esc(hd.temaEmocional)+'</dd>':'')+
 '<dt>Cruz da encarnação</dt><dd>'+esc(hd.cruzEncarnacao.completo)+
   (hd.cruzEncarnacao.destino?'<br><span class="sub2">'+esc(hd.cruzEncarnacao.destino)+'</span>':'')+'</dd>'+
 (hd.cruzEncarnacao.quarter?'<dt>Quarter</dt><dd>'+esc(hd.cruzEncarnacao.quarter.nome)+
   '<br><span class="sub2">'+esc(hd.cruzEncarnacao.quarter.tema)+'</span></dd>':'')+
 (V?'<dt>Motivação</dt><dd>'+esc(V.motivacao.completo)+'</dd>'+
    '<dt>Perspectiva</dt><dd>'+esc(V.perspectiva.valor)+'</dd>'+
    '<dt>Ambiente</dt><dd>'+esc(V.ambiente.completo)+'</dd>'+
    '<dt>Digestão</dt><dd>'+esc(V.digestao.completo)+'</dd>'+
    '<dt>Sentido mais forte</dt><dd>'+esc(V.sentido.completo)+'</dd>':'')+
 '</div>'+
 '<details class="gl"><summary>O que é "Tipo", "Estratégia" e "Autoridade"?</summary>'+
 '<p>Vêm do Desenho Humano, um sistema que lê a posição dos planetas em dois momentos: o do seu nascimento e o de 88 dias antes dele. <b>Tipo</b> é a mecânica de energia — como você foi feito pra se mover. <b>Estratégia</b> é o modo de usar essa mecânica sem gastar à toa. <b>Autoridade</b> é o lugar do corpo de onde a decisão certa costuma sair, em oposição à cabeça, que justifica depois.</p>'+
 '<p>Nada disso é destino. É o manual de uso do aparelho — e você continua sendo quem decide o que fazer com ele.</p></details>'+
 (hd.cruzEncarnacao.nomePendente?'<p class="fine dim">O nome próprio desta cruz não está na tabela do motor. O ângulo, os quatro portões e o quarter acima são exatos — só o apelido dela falta.</p>':'')+
 '<details class="gl"><summary>O que a sua cruz significa</summary>'+
 (hd.cruzEncarnacao.geometriaTexto?'<p><b>'+esc(hd.cruzEncarnacao.destino)+'.</b> '+esc(hd.cruzEncarnacao.geometriaTexto)+'</p>':'')+
 (hd.cruzEncarnacao.quarter?'<p><b>'+esc(hd.cruzEncarnacao.quarter.nome)+'</b> — '+esc(hd.cruzEncarnacao.quarter.reino)+', portas '+esc(hd.cruzEncarnacao.quarter.faixa)+'. '+esc(hd.cruzEncarnacao.quarter.texto)+'</p>'+
   '<p class="fine">Tema místico do quarter: '+esc(hd.cruzEncarnacao.quarter.mistico)+'</p>':'')+
 '<p class="fine">A cruz é formada pelas quatro posições de Sol e Terra — as duas da Personalidade (o minuto do nascimento) e as duas do Design (88 dias antes). O ângulo vem do perfil: 1/3, 1/4, 2/4, 2/5, 3/5, 3/6 e 4/6 são Ângulo Direito; 4/1 é Justaposição; 5/1, 5/2, 6/2 e 6/3 são Ângulo Esquerdo.</p></details>'+
 '<p class="fine">Centros definidos</p><div class="chips">'+
   hd.centrosDefinidos.map(function(c){return '<span class="chip on">'+hd.nomesCentros[c]+'</span>';}).join('')+'</div>'+
 '<p class="fine">Centros abertos</p><div class="chips">'+
   hd.centrosAbertos.map(function(c){return '<span class="chip">'+hd.nomesCentros[c]+'</span>';}).join('')+'</div>'+
 '<p class="fine">Canais ativos</p>'+
   hd.canaisNomeados.map(function(c){return '<div class="lin"><b>'+c.chave+'</b><span>'+esc(c.nome||'—')+'</span></div>';}).join('')+
 '<p class="fine" style="margin-top:14px">Portas — '+hd.portoes.join(', ')+'</p>'+
 '<details class="gl"><summary>As 26 ativações planetárias</summary>'+
 '<div class="scroller"><table class="ativ"><thead><tr><th>Planeta</th><th>Consciente</th><th>Inconsciente</th></tr></thead><tbody>'+
 O.CORPOS_HD.map(function(c){
   var pp=hd.ativacoes.personalidade[c], dd=hd.ativacoes.design[c];
   var rot={Sol:'Sol',Terra:'Terra',NodoNorte:'Nodo Norte',NodoSul:'Nodo Sul',Lua:'Lua',
     Mercurio:'Mercúrio',Venus:'Vênus',Marte:'Marte',Jupiter:'Júpiter',Saturno:'Saturno',
     Urano:'Urano',Netuno:'Netuno',Plutao:'Plutão'}[c]||c;
   return '<tr><td>'+rot+'</td><td>'+pp.portao+'.'+pp.linha+'</td><td>'+dd.portao+'.'+dd.linha+'</td></tr>';}).join('')+
 '</tbody></table></div>'+
 '<p>Consciente é a Personalidade — a posição no minuto do seu nascimento, o que você reconhece como seu. Inconsciente é o Design — a posição 88 dias antes, o que o seu corpo faz sem você mandar e os outros veem antes de você.</p></details></div>'+

 '<div class="bloco q1"><h3>1 · O que já é seu</h3>'+
 '<p class="lede">Constante, confiável, disponível todo dia. Aqui você anda sem pedir licença.</p>'+
 hd.centrosDefinidos.map(function(c){return '<div class="lin"><b>'+NC[c]+'</b><span>'+esc(DEF[c])+'</span></div>';}).join('')+
 (hd.canais.length?'<p class="fine">Canais ativos: '+hd.canais.join(' · ')+'</p>':'')+'</div>'+

 '<div class="bloco q2"><h3>2 · Onde você absorve o ambiente</h3>'+
 '<p class="lede">Não é fraqueza. É onde você amplifica o que está em volta — e onde, com o tempo, vira sabedoria, porque você experimentou de tudo ali.</p>'+
 hd.centrosAbertos.map(function(c){return '<div class="lin"><b>'+NC[c]+'</b><span>'+esc(ABE[c])+'</span></div>';}).join('')+'</div>'+

 (motAb.length?'<div class="bloco q3"><h3>3 · O que não é seu pra carregar</h3>'+
 '<p class="lede">Motores abertos. Forçar aqui custa caro e não escala — estruture, combine ou delegue.</p>'+
 motAb.map(function(c){return '<div class="lin"><b>'+NC[c]+'</b><span>'+esc(DELEG[c])+'</span></div>';}).join('')+'</div>'
 :'<div class="bloco q3"><h3>3 · O que não é seu pra carregar</h3><p class="lede">Todos os seus motores são definidos. Energia própria em tudo — o risco aqui é o oposto: assumir o que era pra ser dividido.</p></div>')+

 '<div class="bloco q4"><h3>4 · Como você entra num grupo</h3><p class="lede">'+esc(GRUPO[hd.tipo]||'')+'</p></div>'+

 '<div class="bloco"><h3>Os territórios</h3>'+terr+'</div>'+

 '<div class="bloco"><h3>A sua carta</h3>'+
 imgCarta(urlArcano(m.taro.numero), m.taro.arcano+' — '+m.taro.deus, 'carta-tipo')+
 '<p class="hero">'+m.taro.numero+' — '+esc(m.taro.arcano)+'</p>'+
 '<p class="lede">'+esc(m.taro.deus)+'</p>'+
 '<details class="gl"><summary>De onde vem essa carta?</summary>'+
 '<p>Do Tarô Mitológico — o baralho que troca os 22 arcanos maiores por deuses e figuras da mitologia grega. Aqui ela não é tirada do baralho: ela é <b>calculada</b> a partir da sua data de nascimento, somando dia, mês e ano até chegar a um número entre 0 e 21.</p>'+
 '<p>Os deuses gregos, nessa leitura, não são divindades a serem cultuadas — são arquétipos, formas recorrentes de a psique humana se organizar. A sua carta é o fio narrativo da sua história, não uma previsão.</p></details></div>'+

 '<div class="bloco"><h3>O que você diz de você</h3>'+
 imgCarta(urlTipo(tp.tipo), 'A sua carta de tipo — '+tp.tipo, 'carta-tipo')+
 '<p class="hero">'+tp.tipo+'</p>'+
 '<p class="fine">Das suas respostas, não do seu nascimento.</p>'+
 '<details class="gl"><summary>O que significam essas quatro letras — e por que elas mudam?</summary>'+
 '<p>São as quatro polaridades que Carl Jung descreveu: para onde a sua energia se volta (<b>E</b> fora / <b>I</b> dentro), como você capta informação (<b>N</b> por padrões / <b>S</b> por fatos concretos), como você decide (<b>F</b> pelo impacto nas pessoas / <b>T</b> pela lógica) e como você lida com o mundo (<b>J</b> fechando decisões / <b>P</b> mantendo aberto).</p>'+
 '<p>Elas saem de um inventário respondido — ou seja, de como você se enxerga <b>hoje</b>. Vindo de um mês difícil, de um trabalho novo, de uma perda, as letras mudam. Isso não é falha do teste: é o retrato daquele dia. O mapa do céu é fixo; este aqui é o vivo. A distância entre os dois é onde o jogo acontece.</p></details></div>'+

 (dv.length?'<div class="bloco tensao"><h3>Onde o mapa e você não batem</h3>'+
 '<p class="lede">Nem erro nem contradição. É onde a sua decisão já está agindo por cima do desenho.</p>'+
 dv.map(function(x){return '<div class="dv"><b>'+esc(x[0])+'</b><p>'+esc(x[1])+'</p><p class="perg">'+esc(x[2])+'</p></div>';}).join('')+'</div>':'')+
 (cv.length?'<div class="bloco"><h3>Onde bate</h3>'+cv.map(function(c){return '<p class="lede">'+esc(c)+'</p>';}).join('')+'</div>':'')+

 '<div class="fim">'+
 '<p class="eyebrow">E agora?</p>'+
 '<h2 class="fim-t">Você tem o mapa.</h2>'+
 '<p class="fim-s">Mas existe uma pergunta que ele não responde por conta própria.</p>'+
 '<p class="lede fecho">'+esc(window.Narrativa.fecho({entrada:{nome:S.nome}})).replace(/\n\n/g,'</p><p class="lede fecho">')+'</p>'+
 '<p class="fim-q">E o que eu faço com isso?</p>'+
 '</div>'+
 '<p class="selo-v">RPG · '+MARCA()+' · /*__VERSAO__*/ · gerado em '+carimbo+'</p>'+
 '<div class="assina"><b>Elvis Pimentel</b>'+
 '<span>Criador do RPG — '+MARCA()+'. Passei anos estudando e mesmo assim repetindo a mesma realidade — até entender que o problema nunca tinha sido falta de informação. Este autorretrato é a primeira coisa que eu queria ter recebido naquela época.</span></div>'+
 '';

 /* A Ficha existe inteira, sempre — história e dados no mesmo documento.
    Ela não fica na tela: abre quando a pessoa pede, dentro do jogo. */
 window.__FICHA={ html: cab+parte1+'<hr class="ficha-sep">'+parte2, carimbo: carimbo };

 /* A etapa 6 é escura: o jogo contando a história e entregando o item. */
 return tela(
  '<div class="escuro-tela">'+
  '<p class="i-bl sys on" style="margin-bottom:26px">Ficha gerada.</p>'+
  '<p class="p-escuro">RPG quer dizer jogo de interpretação de papéis. Você já está interpretando um.</p>'+
  '<p class="p-escuro">A pergunta é se ele foi escolhido por você.</p>'+
  '<p class="ps-escuro"><b>P.S.</b> — É provável que apareçam dúvidas agora. Deixa elas aparecerem. '+
  'Não corre atrás de resposta ainda — anota a que mais incomodar. Elas são respondidas na próxima etapa.</p>'+
  '<div class="item">'+
    '<span class="i-cat">Arquivo</span>'+
    '<b class="i-nome">A Ficha '+G('do Jogador','da Jogadora','do Jogador')+'</b>'+
    '<i class="i-sub">A sua história e os seus dados, num documento só. '+esc(S.nome)+' · '+carimbo+'</i>'+
    '<button type="button" class="i-abrir" id="b-ficha">Abrir a ficha</button>'+
  '</div>'+
  '<p class="fine-escuro">Guarda esse arquivo. É dele que os Guardiões vão puxar ao longo dos portais.</p>'+
  '<label class="refl-escuro"><span>Qual frase mais bateu, ou mais incomodou?</span>'+
    '<textarea id="i-refl" rows="2" placeholder="uma linha basta"></textarea>'+
    '<i>Opcional. Dá pra seguir sem responder.</i></label>'+
  '<button class="go-escuro" id="b7">Receber minhas Instruções Iniciais</button>'+
  '</div>','escura');}

/* =====================================================================
   ETAPA 7 — INSTRUÇÕES INICIAIS
   O vídeo usa o modo iosFakeFullscreen do Panda — controles corrigidos por Elvis.
   A oferta não existe na página até PORTA_SEG. Não é truque de escassez:
   é para a pessoa decidir depois de entender, não durante.
   ===================================================================== */
var PANDA_LIB='https://player.pandavideo.com.br/api.v2.js';
var PANDA_ID='4f78b8ff-d144-4e62-99ff-c9958c9b65e1';
var PANDA_SRC='https://player-vz-4b309748-76d.tv.pandavideo.com.br/embed/?v='+PANDA_ID+'&iosFakeFullscreen=true';
var CK_TRI='https://pay.cakto.com.br/8vo2h6x_1075180';
var CK_ANO='https://pay.cakto.com.br/fk43j6p';
var PORTA_SEG=1010;   /* 16min50 */
/* Para conferir a oferta sem assistir 17 minutos: ?porta=10 na URL.
   Serve para o teste e para a demonstração; não muda nada para quem joga. */
try{ var _pq=(location.search.match(/[?&]porta=(\d+)/)||[])[1];
     if(_pq) PORTA_SEG=Math.max(3, Math.min(3600, parseInt(_pq,10)));
     window.__VID_PORTA=function(){return PORTA_SEG;}; }catch(e){}

var ETAPAS_IMERSAO=[
 ['Você Já Entrou',
  'Você chega com uma vontade de mudar que ainda não tem nome.',
  'Sai com o seu destino escrito — nas suas palavras, com data.'],
 ['O Tabuleiro Atual',
  'Hoje a resposta para "como está a sua vida?" é "mais ou menos".',
  'Os doze pilares medidos, um a um. É contra este retrato que você vai comparar daqui a alguns meses — e ver o que realmente se moveu.'],
 ['A Linha da Vida',
  'Você acha que já conhece a sua história.',
  'Você investiga cada setênio por vários ângulos e descobre de onde vêm as decisões que você chama de "meu jeito de ser".'],
 ['As Forças que Jogam Através de Você',
  'Você acredita que as suas escolhas são todas suas.',
  'Você reconhece o personagem que se repete, o Personagem do Quase — e os pêndulos: as estruturas coletivas (a família, a profissão, uma crença, um grupo) que se alimentam da sua energia e devolvem regras de como você deve viver.'],
 ['O que a sua História Colocou nas suas Mãos',
  '"Eu não tenho nada de especial."',
  'Um inventário do que você já domina: lastro, conhecimentos, habilidades e as suas áreas de maestria — escritas, onde você pode ver.'],
 ['A Realidade que Você Escolhe Alimentar',
  'Você quer várias coisas ao mesmo tempo, e nenhuma anda.',
  'Uma realidade central escolhida, e os quatro eixos que sustentam ela de pé.'],
 ['Quem Consegue Sustentar essa Realidade?',
  'Você quer o resultado.',
  'Você entende a Alfândega da Realidade — toda realidade nova cobra um preço de entrada, e quem paga é a identidade. Aqui você define quem precisa ser para atravessar, e as quatro vitórias diárias que sustentam essa pessoa.'],
 ['O Plano de Jogo',
  'Você tem intenção.',
  'Você tem evidências definidas, o primeiro ciclo montado e um protocolo para reduzir a procrastinação quando ela vier — e ela vem.'],
 ['Ativação da Forja',
  'Você planejou.',
  'Você jogou. Bússola Diária ligada, Diário da Forja aberto e a sua primeira jogada feita — não amanhã, ali.'],
 ['Até Onde Você Quer Jogar?',
  'O caminho se abre em dois.',
  'Você vai entender a diferença quando chegar aqui. A escolha é sua, e ela não muda nada do que você já construiu.'],
 ['O Campo',
  'Você tem um impulso.',
  'Você tem um ritmo. Sustentação e revisões, no seu tempo — sem cronômetro, sem prazo que alguém inventou por você.']
];

function blocoOferta(){
  var etapas=ETAPAS_IMERSAO.map(function(e,k){
    return '<li class="im-et">'+
      '<span class="im-n">'+(k+1<10?'0':'')+(k+1)+'</span>'+
      '<div><b>'+esc(e[0])+'</b>'+
        '<span class="im-a">'+esc(e[1])+'</span>'+
        '<span class="im-b">'+esc(e[2])+'</span>'+
      '</div></li>';
  }).join('');

  return '<section class="im-oferta'+(S.ofertaVista?' on':'')+'" id="oferta"'+(S.ofertaVista?'':' hidden')+'>'+

  '<p class="im-eye">Recapitulando</p>'+
  '<h2 class="im-h">A Imersão não é um evento.</h2>'+
  '<p class="p-escuro">Você não vai a lugar nenhum. Ninguém reserva hotel, ninguém bloqueia o fim de semana.</p>'+
  '<p class="p-escuro">É uma imersão <b>em você</b> — provavelmente não do jeito que você já tentou antes, porque desta vez tem ordem, tem registro e tem alguém perguntando.</p>'+
  '<p class="p-escuro">São onze etapas. Cada uma tem um ponto de entrada e um ponto de saída. Você chega de um jeito e sai de outro.</p>'+

  '<ol class="im-lista">'+etapas+'</ol>'+

  '<p class="im-eye" style="margin-top:34px">E todo dia, fora das etapas</p>'+
  '<div class="im-tri">'+
    '<div><b>A Bússola Diária</b><span>Todo dia você recebe uma notificação com o que o céu está ativando na sua vida naquele dia — e qual ação isso potencializa para você avançar no objetivo que você mesmo definiu.</span></div>'+
    '<div><b>O Diário da Forja</b><span>Onde a evidência fica registrada. Não é motivação: é prova de que você jogou. Você vai poder olhar para trás e ver.</span></div>'+
    '<div><b>O Guardião</b><span>Sabatina socrática. Ele devolve pergunta, nunca sentença. Nunca diz quem você é — porque isso quem descobre é você.</span></div>'+
  '</div>'+

  '<div class="im-corte"></div>'+

  '<p class="im-eye">O acesso</p>'+
  '<h2 class="im-h">Quanto tempo você quer com ela?</h2>'+
  '<p class="p-escuro">Tudo isso mora no aplicativo — as forjas, os diários, o histórico. É ele que segura o seu ritmo, para você não depender de papel solto, caderno esquecido na gaveta ou aplicativo que você abandona em duas semanas. Você já viveu isso.</p>'+
  '<p class="p-escuro">Pensa nele como a equipe de apoio de um objetivo que <b>você mesmo</b> se propôs.</p>'+
  '<p class="p-escuro">A jornada não tem prazo — você faz no seu ritmo. <b>O acesso tem.</b> É só isso que você decide agora:</p>'+

  '<div class="im-planos">'+
    '<div class="im-plano">'+
      '<span class="im-dur">3 meses de acesso</span>'+
      '<b class="im-val">R$ 97<i>,00</i></b>'+
      '<span class="im-mes">R$ 32,33 por mês</span>'+
      '<span class="im-diz">Tempo para atravessar as onze etapas e ativar a Forja.</span>'+
      '<button type="button" class="im-go" data-ck="tri">Entrar por 3 meses</button>'+
    '</div>'+
    '<div class="im-plano im-destaca">'+
      '<span class="im-selo">Metade do custo por mês</span>'+
      '<span class="im-dur">1 ano de acesso</span>'+
      '<b class="im-val">R$ 197<i>,00</i></b>'+
      '<span class="im-mes im-ouro">R$ 16,42 por mês</span>'+
      '<span class="im-diz">Para voltar, revisar e sustentar ao longo do ano inteiro.</span>'+
      '<button type="button" class="im-go im-forte" data-ck="ano">Entrar por 1 ano</button>'+
    '</div>'+
  '</div>'+
  '<p class="fine-escuro">A Imersão é a mesma nos dois. O que muda é por quanto tempo a porta fica aberta.</p>'+


  '<div class="im-corte"></div>'+

  '<p class="im-eye">E se não for agora</p>'+
  '<p class="p-escuro">Também é uma jogada. O seu Autorretrato continua seu — está no seu e-mail, e você volta a ele quando quiser.</p>'+
  '<p class="p-escuro">Só não confunda <b>adiar</b> com <b>decidir</b>. Se a resposta for não, que seja um não escolhido, e não um não por inércia. Essa distinção é metade do jogo.</p>'+
  '</section>';
}

function T7(){
 return tela(
  '<div class="escuro-tela t7'+(S.ofertaVista?' solto':'')+'" id="t7-cx">'+
  '<p class="i-bl sys on">Etapa 7 · Instruções Iniciais</p>'+
  '<h1 class="h-escuro">Você já tem o mapa.<br>E agora?</h1>'+
  '<div class="vvert" id="vvert"><div id="panda-'+PANDA_ID+'"></div></div>'+
  '<p class="fine-escuro" id="v-dica">'+(S.ofertaVista?'Continua abaixo.':'Toca para assistir. Som ligado, 18 minutos.')+'</p>'+
  blocoOferta()+
  '<button class="volta-escuro" id="b-volta6">Voltar à minha ficha</button>'+
  '</div>','escura');}

/* --- o player, os eventos e a porta ------------------------------------- */
var VID={ligado:false, parede:0, player:0, relogio:null, abriu:false};
try{ window.__VID=VID; }catch(e){}

function abrirOferta(){
  if(VID.abriu) return; VID.abriu=true;
  /* quem já chegou até aqui não precisa assistir de novo para ver a oferta */
  try{ S.ofertaVista=true; salvar(); }catch(e){}
  var o=document.getElementById('oferta'); if(!o) return;
  var cx=document.getElementById('t7-cx'); if(cx) cx.classList.add('solto');
  o.hidden=false;
  /* deixa o navegador calcular a altura antes de animar */
  requestAnimationFrame(function(){ o.classList.add('on'); });
  var d=document.getElementById('v-dica');
  if(d) d.textContent='Continua abaixo.';
  trackUmaVez('immersion_offer_viewed');
  som('passo');
}

/* Duas medidas correndo juntas, e vale a maior das duas.
   Antes eu desligava o relógio assim que a API do Panda dava sinal de vida —
   e se ela mandasse um evento só e calasse, o contador congelava e a oferta
   não abria nunca. Foi exatamente isso que aconteceu. Agora o relógio de
   parede só para quando a pessoa sai da aba ou pausa o vídeo. */
function relogioLiga(){
  if(VID.relogio||VID.abriu) return;
  VID.relogio=setInterval(function(){
    VID.parede++;
    if(Math.max(VID.parede,VID.player)>=PORTA_SEG){ relogioPara(); abrirOferta(); }
  },1000);
}
function relogioPara(){ if(VID.relogio){ clearInterval(VID.relogio); VID.relogio=null; } }

function montarPanda(){
  if(VID.ligado) return; VID.ligado=true;
  if(S.ofertaVista){ VID.abriu=true; }
  var caixa=document.getElementById('vvert');
  if(!caixa) return;

  var f=document.createElement('iframe');
  f.id='panda-'+PANDA_ID;
  f.src=PANDA_SRC;
  f.setAttribute('allow','accelerometer;gyroscope;autoplay;encrypted-media;picture-in-picture');
  f.setAttribute('allowfullscreen','true');
  f.setAttribute('fetchpriority','high');
  var alvo=document.getElementById('panda-'+PANDA_ID);
  if(alvo && alvo.parentNode) alvo.parentNode.replaceChild(f,alvo); else caixa.appendChild(f);

  /* Caminho 1 — a API do Panda. É a medida boa: respeita pausa e avanço. */
  carregarScript(PANDA_LIB).then(ligarApi)['catch'](function(){ /* caminho 2 assume */ });
  function ligarApi(){
    try{
      window.pandascripttag = window.pandascripttag || [];
      window.pandascripttag.push(function(){
        var pid='panda-'+PANDA_ID;
        var pl=new window.PandaPlayer(pid,{
          onReady:function(){ try{ pl.loadWindowScreen({panda_id_player:pid}); }catch(e){} },
          onEvent:function(ev){
            var m=(ev&&(ev.message||ev))||{};
            var tipo=m.type||ev.type||'';
            var t=m.currentTime;
            if(typeof t==='number' && t>0) VID.player=Math.max(VID.player,Math.floor(t));
            if(Math.max(VID.parede,VID.player)>=PORTA_SEG) abrirOferta();
            if(tipo==='play'||tipo==='onStart'||tipo==='playing'||tipo==='onPlay'){
              trackUmaVez('initial_instructions_play'); relogioLiga();
            }
            if(tipo==='pause'||tipo==='onPause') relogioPara();
            if(tipo==='ended'||tipo==='onEnded') abrirOferta();
          }
        });
      });
    }catch(e){}
  }

  /* Caminho 2 — relógio de parede. Se a API não vier (bloqueio, versão nova,
     rede ruim), a oferta ainda aparece. Nunca deixar a pessoa presa. */
  relogioLiga();
  document.addEventListener('visibilitychange',function(){
    if(document.hidden) relogioPara(); else if(!VID.abriu) relogioLiga();
  });
}

function prefixoCheckout(url){
  var q=[];
  if(S.nome)  q.push('name='+encodeURIComponent(S.nome));
  if(S.email){ q.push('email='+encodeURIComponent(S.email));
               q.push('confirmEmail='+encodeURIComponent(S.email)); }
  var tel=String(S.tel||'').replace(/\D/g,'');
  if(tel.length>=10) q.push('phone='+encodeURIComponent(tel.length>11?tel:'55'+tel));
  return q.length ? url+'?'+q.join('&') : url;
}

var PLANOS={
  tri:{url:CK_TRI, nome:'Entre o Mapa e a Jogada', diz:'3 meses de acesso · R$ 97'},
  ano:{url:CK_ANO, nome:'Entre o Mapa e a Jogada', diz:'1 ano de acesso · R$ 197'}
};

function fecharCheckout(){
  var d=document.getElementById('ckt'); if(!d) return;
  d.classList.remove('on');
  document.body.removeAttribute('data-ckt');
  setTimeout(function(){ var f=document.getElementById('ckt-ifr'); if(f) f.src='about:blank'; },340);
  som('passo');
}

function abrirCheckout(plano){
  var pl=PLANOS[plano]||PLANOS.tri;
  var url=prefixoCheckout(pl.url);
  trackEvent('checkout_clicked',{plano:plano==='ano'?'anual':'trimestral'});

  var d=document.getElementById('ckt');
  if(!d){
    d=document.createElement('div'); d.id='ckt';
    d.innerHTML='<div class="ckt-topo">'+
        '<div class="ckt-quem"><b id="ckt-nome"></b><span id="ckt-diz"></span></div>'+
        '<button type="button" class="ckt-volta" id="ckt-x">Voltar</button>'+
      '</div>'+
      '<div class="ckt-corpo">'+
        '<div class="ckt-espera" id="ckt-espera">Abrindo o pagamento…</div>'+
        '<iframe id="ckt-ifr" title="Pagamento" allow="payment *; clipboard-write" referrerpolicy="origin"></iframe>'+
      '</div>'+
      '<p class="ckt-fora" id="ckt-fora" hidden><a id="ckt-fora-a" target="_blank" rel="noopener">Abrir o pagamento numa nova aba</a></p>';
    document.body.appendChild(d);
    d.querySelector('#ckt-x').onclick=fecharCheckout;
  }
  document.getElementById('ckt-nome').textContent=pl.nome;
  document.getElementById('ckt-diz').textContent=pl.diz;
  var esp=document.getElementById('ckt-espera'); if(esp) esp.style.display='';
  var fora=document.getElementById('ckt-fora'), foraA=document.getElementById('ckt-fora-a');
  if(fora) fora.hidden=true;
  if(foraA) foraA.href=url;

  var ifr=document.getElementById('ckt-ifr');
  ifr.onload=function(){ if(esp) esp.style.display='none'; };
  ifr.src=url;

  document.body.setAttribute('data-ckt','1');
  d.classList.add('on');
  som('passo');

  /* Se a Cakto recusar ser embutida, a pessoa não pode ficar olhando para o
     branco: depois de 5s sem conteúdo, a saída em nova aba aparece. */
  setTimeout(function(){
    var vazio=true;
    try{ vazio = !ifr.contentWindow || ifr.contentWindow.length===0; }catch(e){ vazio=false; }
    if(vazio && fora){ fora.hidden=false; if(esp) esp.textContent='O pagamento não abriu aqui dentro.'; }
  },5000);
}

/* =====================================================================
   A FICHA — item, não página. Abre por cima do jogo, a pessoa lê, fecha
   e volta exatamente de onde saiu. Nunca leva ninguém para fora do mundo.
   ===================================================================== */
function abrirFicha(){
  if(!window.__FICHA) return;
  var d=document.getElementById('ficha');
  if(!d){
    d=document.createElement('div'); d.id='ficha';
    d.innerHTML='<div class="f-topo">'+
        '<span class="f-tit">A Ficha '+G('do Jogador','da Jogadora','do Jogador')+'</span>'+
        '<button type="button" class="f-fechar" id="f-x">Fechar</button></div>'+
      '<div class="f-corpo" id="f-corpo"></div>'+
      '<div class="f-pe noprint">'+
        '<button type="button" class="f-acao f-destaque" id="f-pdf">Baixar a minha ficha em PDF</button>'+
        '<button type="button" class="f-acao" id="f-copy">Copiar o texto</button>'+
        '<button type="button" class="f-acao f-mail" id="f-mail">Quero receber no meu e-mail</button>'+
        '<p class="f-msg" id="f-msg"></p>'+
        '<button type="button" class="f-voltar" id="f-volta">Voltar ao jogo</button>'+
      '</div>';
    document.body.appendChild(d);
    d.querySelector('#f-x').onclick=fecharFicha;
    d.querySelector('#f-volta').onclick=fecharFicha;
    d.querySelector('#f-pdf').onclick=function(){ salvarFicha(); };
    d.querySelector('#f-copy').onclick=function(){
      var t=document.getElementById('f-corpo').innerText;
      trackEvent('portrait_downloaded',{via:'copiar'});
      var msg=document.getElementById('f-msg');
      try{ navigator.clipboard.writeText(t).then(function(){msg.textContent='Copiado. Cola onde você guarda as suas coisas.';},
        function(){msg.textContent='Não consegui copiar sozinho — selecione o texto e copie.';}); }
      catch(e){ msg.textContent='Não consegui copiar sozinho — selecione o texto e copie.'; }
    };
    d.querySelector('#f-mail').onclick=function(){
      var msg=document.getElementById('f-msg'), bt=this;
      trackEvent('portrait_email_requested');
      if(!S.email){ msg.textContent='Não tenho o seu e-mail. Volta uma etapa e me deixa onde te encontrar.'; return; }
      if(!S.okRelatorio){ msg.textContent='Falta a sua autorização para eu usar o seu e-mail.'; return; }
      bt.disabled=true; msg.textContent='Enviando para '+S.email+'…';
      /* garante que o jogador existe no banco antes de pedir o envio */
      sincronizar('email').then(function(){
        return fetch(API+'enviar-ficha',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({player_id:playerId,
            html:(document.getElementById('f-corpo')||{}).innerHTML||''})});
      }).then(function(r){ return r.json().catch(function(){return {};}).then(function(j){return {r:r,j:j};}); })
      .then(function(o){
        bt.disabled=false;
        if(o.r.ok){ msg.textContent = o.j.ja_enviado
            ? 'Já mandei há pouco — confere a sua caixa de entrada e o spam.'
            : 'Enviado para '+S.email+'. Se não chegar em alguns minutos, olha o spam.'; return; }
        if(o.j && o.j.erro==='sem_chave'){ msg.textContent='O envio está fora do ar neste momento. Salva em PDF — eu te mando assim que voltar.'; return; }
        if(o.j && o.j.erro==='sem_consentimento'){ msg.textContent='Falta a sua autorização para eu usar o seu e-mail.'; return; }
        /* mensagem honesta: o problema é do lado de cá, não da pessoa */
        msg.textContent='O envio está fora do ar neste momento — é problema meu, não seu. '+
          'Salva em PDF agora e eu te mando por e-mail assim que voltar.';
      })
      .catch(function(){ bt.disabled=false;
        msg.textContent='Sem conexão para enviar agora. Salva em PDF que o arquivo é o mesmo.'; });
    };
  }
  document.getElementById('f-corpo').innerHTML=window.__FICHA.html;
  document.body.setAttribute('data-ficha','1');
  d.classList.add('on'); d.scrollTop=0;
  var c=d.querySelector('.f-corpo'); if(c) c.scrollTop=0;
  som('marca');
  trackUmaVez('ficha_opened');
}
/* ---------------------------------------------------------------------
   Salvar a Ficha como arquivo. A biblioteca vem do CDN e só é buscada no
   primeiro clique — não pesa no carregamento do jogo. Se ela não vier
   (rede ruim, bloqueio), cai para a impressão do navegador, que é o
   caminho nativo de PDF no celular. Nunca fica sem saída.
   --------------------------------------------------------------------- */
var PDF_LIBS=['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
              'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'];
function carregarScript(src){
  return new Promise(function(ok,falha){
    var t=document.createElement('script'); t.src=src; t.async=true;
    t.onload=ok; t.onerror=function(){falha(new Error('cdn'));};
    document.head.appendChild(t);
    setTimeout(function(){falha(new Error('tempo'));}, 12000);
  });
}
function nomeArquivo(){
  var n=(S.nome||'jogador').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
        .replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return 'Ficha-'+n+'.pdf';
}
function imprimirFicha(msg,motivo){
  if(msg) msg.textContent = motivo || 'Abrindo a impressão — escolha "Salvar em PDF" na janela que aparecer.';
  try{
    if(window.self!==window.top){
      if(msg) msg.textContent='A impressão está bloqueada dentro desta moldura. No app publicado funciona normalmente — enquanto isso, use "Copiar o texto".';
      return;
    }
    window.print();
  }catch(e){ if(msg) msg.textContent='O navegador não deixou abrir a impressão. Use "Copiar o texto".'; }
}
/* A Ficha vive dentro de um painel `position:fixed` que rola por dentro.
   Fotografar esse elemento no lugar devolve só o pedaço visível na tela —
   era esse o "print do celular". A saída é clonar a Ficha para fora do
   painel, numa caixa solta de largura fixa e altura livre, fotografar o
   clone inteiro e jogar o clone fora. */
function clonarFichaParaFoto(){
  var orig=document.getElementById('f-corpo');
  if(!orig) return null;
  var caixa=document.createElement('div');
  caixa.id='f-foto';
  /* fora da tela, mas VISÍVEL: com opacity 0 o html2canvas fotografa o vazio */
  caixa.style.cssText='position:fixed;left:-20000px;top:0;width:'+LARGURA_FOTO+'px;'+
    'background:#FFFDFA;color:#39414F;padding:36px 40px;box-sizing:border-box;'+
    'pointer-events:none;overflow:visible;opacity:1;';
  var c=orig.cloneNode(true);
  c.removeAttribute('id');
  c.style.cssText='height:auto;max-height:none;overflow:visible;width:auto;'+
    'max-width:none;position:static;transform:none;';
  /* Abre o que estiver dobrado, para o arquivo sair completo. Fora isso,
     não mexer em altura ou overflow de elemento nenhum: forçar isso em tudo
     desmancha o layout e as linhas se sobrepõem. */
  Array.prototype.forEach.call(c.querySelectorAll('details'),function(d){d.open=true;});
  Array.prototype.forEach.call(c.querySelectorAll('*'),function(el){
    var e=getComputedStyle(el);
    if(e.position==='fixed'||e.position==='sticky') el.style.position='static';
  });
  caixa.appendChild(c);
  document.body.appendChild(caixa);
  return caixa;
}
var LARGURA_FOTO=760;

/* espera as imagens do clone antes de fotografar — senão a carta sai em branco */
function esperarImagens(raiz){
  var imgs=Array.prototype.slice.call(raiz.querySelectorAll('img'));
  if(!imgs.length) return Promise.resolve();
  return Promise.all(imgs.map(function(im){
    if(im.complete && im.naturalWidth) return Promise.resolve();
    return new Promise(function(ok){
      var fim=function(){ok();};
      im.addEventListener('load',fim); im.addEventListener('error',fim);
      setTimeout(fim,4000);
    });
  }));
}

function salvarFicha(){
  var msg=document.getElementById('f-msg'), bt=document.getElementById('f-pdf');
  trackEvent('portrait_downloaded',{via:'pdf'});
  if(msg) msg.textContent='Montando o arquivo…';
  if(bt) bt.disabled=true;
  var caixa=null;
  var libs = (window.jspdf && window.html2canvas)
    ? Promise.resolve()
    : Promise.all(PDF_LIBS.map(carregarScript));
  libs.then(function(){
    if(!window.jspdf || !window.html2canvas) throw new Error('libs');
    caixa=clonarFichaParaFoto();
    if(!caixa) throw new Error('sem ficha');
    return esperarImagens(caixa).then(function(){
      /* Teto de pixels: acima disso o celular devolve um canvas em branco.
         Melhor um arquivo um pouco menos nítido do que um arquivo vazio. */
      var alt=caixa.scrollHeight;
      var TETO=9000000;
      var esc1=Math.min(2,(window.devicePixelRatio||1)+.5);
      var cabe=Math.sqrt(TETO/(LARGURA_FOTO*Math.max(alt,1)));
      var escala=Math.max(.75, Math.min(esc1, cabe));
      return window.html2canvas(caixa, {
        scale: escala,
        useCORS:true, backgroundColor:'#FFFDFA', logging:false,
        width:LARGURA_FOTO, windowWidth:LARGURA_FOTO,
        height:alt, windowHeight:alt,
        scrollX:0, scrollY:0, x:0, y:0
      });
    }).then(function(canvas){
      var jsPDF=window.jspdf.jsPDF;
      var pdf=new jsPDF({unit:'pt', format:'a4', compress:true});
      var lp=pdf.internal.pageSize.getWidth(), ap=pdf.internal.pageSize.getHeight();
      var margem=28, larg=lp-margem*2, altUtil=ap-margem*2;
      var escala=larg/canvas.width;                    /* px do canvas -> pt */
      var altPagPx=Math.floor(altUtil/escala);         /* quanto cabe por página */
      var y=0, pagina=0;
      /* fatia o canvas página por página: cada página é uma imagem própria,
         em vez da imagem inteira deslocada — sai mais leve e não estoura
         a memória do celular numa ficha longa */
      while(y<canvas.height && pagina<60){
        var h=Math.min(altPagPx, canvas.height-y);
        var tmp=document.createElement('canvas');
        tmp.width=canvas.width; tmp.height=h;
        var ctx=tmp.getContext('2d');
        ctx.fillStyle='#FFFDFA'; ctx.fillRect(0,0,tmp.width,h);
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if(pagina>0) pdf.addPage();
        pdf.addImage(tmp.toDataURL('image/jpeg',.9),'JPEG',
          margem, margem, larg, h*escala, undefined,'FAST');
        y+=h; pagina++;
      }
      pdf.save(nomeArquivo());
      if(msg) msg.textContent='Pronto — a sua ficha foi salva como '+nomeArquivo()+
        ' ('+pagina+(pagina>1?' páginas).':' página).');
      if(bt) bt.disabled=false;
    });
  })['catch'](function(){
    if(bt) bt.disabled=false;
    imprimirFicha(msg, 'Não consegui montar o arquivo aqui. Abrindo a impressão — escolha "Salvar em PDF".');
  }).then(function(){
    if(caixa && caixa.parentNode) caixa.parentNode.removeChild(caixa);
  });
}

function fecharFicha(){
  var d=document.getElementById('ficha'); if(!d) return;
  d.classList.remove('on'); document.body.removeAttribute('data-ficha');
  som('passo');
}

var EV_ETAPA={4:'self_assessment_started',6:'portrait_viewed',7:'initial_instructions_viewed'};
function render(){
 var t=[T0,T1,T2,T3,T4,T5,T6,T7][S.etapa]||T0;
 document.body.setAttribute('data-cena', S.etapa===0?'cartaz':(S.etapa>=6?'escuro':'claro'));
 document.body.setAttribute('data-etapa', String(S.etapa));
 app.innerHTML=barra()+t();
 /* a história é contada uma vez, na entrada da etapa 6 */
 if(S.etapa===6 && !instrJaViu('historia') && window.__DADOS_HIST){
   var rh=roteiroHistoria();
   if(rh) instrRoda('historia', function(){}, rh);
 }
 if(EV_ETAPA[S.etapa]) trackUmaVez(EV_ETAPA[S.etapa]);
 if(S.etapa===6&&S.sub===1) trackUmaVez('portrait_detail_viewed');
 var $=function(i){return document.getElementById(i);};
 Array.prototype.forEach.call(app.querySelectorAll('[data-ir]'),function(b){b.onclick=function(){ir(+b.dataset.ir);};});
 /* O clique do cartaz é tratado por delegação, mais abaixo — assim ele
    funciona mesmo se o construtor de site mexer no HTML depois de pronto. */

 /* etapa 1a — só o nome */
 if($('b1a'))$('b1a').onclick=function(){
   var av=$('nomeerr');
   S.nome=$('i-nome').value.trim();
   if(!S.nome){av.textContent='Falta como te chamar.';av.className='fine erro';$('i-nome').focus();return;}
   salvar(); trackEvent('name_completed');
   /* O mundo responde com o que você acabou de dar: nome, dia e hora exata.
      Sem explicar nada — o carimbo faz o trabalho sozinho. */
   var ag=new Date();
   var SEM=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
   var MES2=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
   var carim=SEM[ag.getDay()]+', '+ag.getDate()+' de '+MES2[ag.getMonth()]+' de '+ag.getFullYear()+
     ', '+String(ag.getHours()).padStart(2,'0')+'h'+String(ag.getMinutes()).padStart(2,'0')+'min'+String(ag.getSeconds()).padStart(2,'0');
   trackEvent('portal_aberto',{quando:ag.toISOString()});
   instrRoda('boasvindas', function(){ ir(1,1); }, { ppm:[130,170], piso:850, decai:.9, b:[
     {t:'sys',x:'Jogador'+(S.genero==='f'?'a':'')+' reconhecid'+(S.genero==='f'?'a':'o')+': '+pnome()+'.',d:800},
     {t:'sys',x:carim,d:1500},
     {t:'voz',x:'O seu jogo começa agora.',d:1200}
   ]});};
 /* etapa 1b — só a data */
 if($('b1b'))$('b1b').onclick=function(){
   var av=$('dataerr');
   var v=validarData($('i-dia').value.trim(),$('i-mes').value,$('i-ano').value.trim());
   if(!v.ok){av.textContent=v.erro;av.className='fine erro';return;}
   S.data=v.data; av.className='fine'; salvar();
   trackEvent('birth_data_completed'); ir(2);};
 if($('b1v'))$('b1v').onclick=function(){ir(1,0);};
 /* limpa o aviso assim que a pessoa corrige — sem autoavanço entre campos */
 ['i-dia','i-mes','i-ano'].forEach(function(id){ if($(id)) $(id).oninput=function(){
   var av=$('dataerr'); if(av&&av.className.indexOf('erro')>=0){av.textContent='Ex.: 22 de julho de 1984.';av.className='fine';} };});
 if($('i-nome'))$('i-nome').oninput=function(){
   var av=$('nomeerr'); if(av&&av.className.indexOf('erro')>=0){av.textContent='';av.className='fine';}};
 /* foco no primeiro campo, depois da transição de entrada */
 var pri=$('i-nome')||$('i-dia');
 if(pri&&S.etapa===1) setTimeout(function(){try{pri.focus();}catch(e){}},420);
 if($('i-cid')){var inp=$('i-cid'),lst=$('acl');
   var acTimer=null, acSeq=0, acCache={};
   /* comeca-com vem antes de contem: quem digita 'lisb' quer Lisboa, nao Felisburgo */
   function acLocal(q,so){var ini=[],meio=[],i;
     for(i=0;i<idx.length&&ini.length<8;i++)if(idx[i].indexOf(q)===0)ini.push(cidades[i]);
     if(so)return ini;
     if(ini.length<5)for(i=0;i<idx.length&&meio.length<6;i++){if(idx[i].indexOf(q)>0&&ini.indexOf(cidades[i])<0)meio.push(cidades[i]);}
     return ini.concat(meio);}
   function acDesenha(r){
     if(!r.length){lst.hidden=true;return;}
     lst.innerHTML=r.map(function(c,j){return '<div data-j="'+j+'"><em>'+esc(c.uf)+'</em>'+esc(c.nome)+'</div>';}).join('');
     lst.hidden=false;
     Array.prototype.forEach.call(lst.children,function(el){el.onclick=function(){
       S.cidade=r[+el.dataset.j];
       inp.value=S.cidade.nome+' — '+S.cidade.uf;lst.hidden=true;
       S.hora=($('i-hora')&&$('i-hora').value)||S.hora;
       $('tzf').textContent=fusoTexto();salvar();};});}
   function acMundo(q,bruto){
     /* o servidor é complemento, nunca bloqueio: se falhar, a lista local fica */
     if(acCache[q]){acDesenha(acCache[q]);return;}
     var meu=++acSeq;
     try{
       fetch(API+'cidades?q='+encodeURIComponent(bruto))
         .then(function(r){return r.ok?r.json():[];})
         .then(function(d){
           if(meu!==acSeq||!d||!d.length)return;
           var ini=acLocal(q,true), meio=acLocal(q).slice(ini.length),
               nomesBR={}, vistos={}, r=[], k;
           for(k=0;k<ini.length;k++){nomesBR[nrm(ini[k].nome)]=1;r.push(ini[k]);}
           for(k=0;k<meio.length;k++)nomesBR[nrm(meio[k].nome)]=1;
           for(k=0;k<d.length;k++){
             var n=nrm(d[k].nome);
             /* Brasil já veio da lista local, completa e offline */
             if(d[k].pais==='BR'&&nomesBR[n])continue;
             var ch=n+'|'+d[k].pais; if(vistos[ch])continue; vistos[ch]=1;
             r.push({nome:d[k].nome,uf:d[k].pais,pais:d[k].pais,lat:d[k].lat,lon:d[k].lon,tz:d[k].tz});
             if(r.length>=10)break;
           }
           for(k=0;k<meio.length&&r.length<12;k++)r.push(meio[k]);
           acCache[q]=r; acDesenha(r);
         })['catch'](function(){});
     }catch(e){}}
   inp.oninput=function(){var bruto=inp.value.trim(), q=nrm(bruto);S.cidade=null;
     if(q.length<2){lst.hidden=true;return;}
     acDesenha(acLocal(q));
     if(acTimer)clearTimeout(acTimer);
     acTimer=setTimeout(function(){acMundo(q,bruto);},280);};}
 if($('b3'))$('b3').onclick=function(){S.hora=$('i-hora').value;S.horaIncerta=$('i-inc').checked;
   if(!S.cidade){alert('Escolha a cidade na lista.');return;}
   if(!S.hora&&!S.horaIncerta){alert('Informe a hora ou marque que não tem certeza.');return;}
   if(!S.hora)S.hora='12:00';ir(4,0);};
 Array.prototype.forEach.call(app.querySelectorAll('.lk button'),function(b){b.onclick=function(){
   S.resp[b.dataset.q]=+b.dataset.v;salvar();
   Array.prototype.forEach.call(b.parentNode.children,function(x){x.className=x===b?'on':'';});};});
 if($('b4'))$('b4').onclick=function(){var bl=Math.ceil(ITENS.length/4);
   if(S.sub+1<bl)ir(4,S.sub+1);else{trackUmaVez('self_assessment_completed');ir(5);}};
 if($('b4v'))$('b4v').onclick=function(){ir(4,S.sub-1);};
 if($('b5'))$('b5').onclick=function(){
   S.email=$('i-mail').value.trim();S.tel=$('i-tel').value.trim();
   S.okRelatorio=$('c-rel').checked;S.okNovidades=$('c-nov').checked;S.maior=$('c-mai').checked;
   if(!S.email||S.email.indexOf('@')<0){alert('Preciso de um e-mail válido para continuar.');return;}
   if(!S.okRelatorio){alert('Preciso da sua autorização para usar o seu e-mail.');return;}
   if(!S.maior){alert('O jogo é para maiores de 18 anos.');return;}
   trackUmaVez('portrait_generated');ir(6);};
 if($('b7'))$('b7').onclick=function(){var ta=document.getElementById('i-refl');
   if(ta){var v=ta.value.trim().slice(0,600);if(v!==(S.reflexao||'')){S.reflexao=v;salvar();if(v)trackEvent('reflection_selected',{tamanho:v.length});}}
   trackEvent('initial_instructions_clicked');
   /* a interface apaga e o sistema toma a palavra */
   instrRoda('instrucoes', function(){ trackUmaVez('initial_instructions_started'); ir(7); });};
 if($('b-ficha'))$('b-ficha').onclick=function(){abrirFicha();};
 if($('b-volta6'))$('b-volta6').onclick=function(){ir(6);};
 if($('vvert')){ trackUmaVez('initial_instructions_viewed'); montarPanda(); }
 Array.prototype.forEach.call(document.querySelectorAll('.im-go'),function(b){
   b.onclick=function(){ abrirCheckout(b.dataset.ck); };});
 if($('i-refl')){var ta=$('i-refl'); ta.value=S.reflexao||'';
   ta.onblur=function(){var v=ta.value.trim().slice(0,600);
     if(v!==(S.reflexao||'')){S.reflexao=v;salvar();if(v)trackEvent('reflection_selected',{tamanho:v.length});}};}
 if($('b-pdf'))$('b-pdf').onclick=function(){
   trackEvent('portrait_downloaded',{via:'pdf'});
   var msg=document.getElementById('mailmsg');
   try{
     if(window.self!==window.top){
       msg.textContent='A impressão está bloqueada aqui dentro porque esta demonstração roda numa moldura protegida. No app publicado, no seu domínio, o botão abre a impressão normalmente. Enquanto isso: use "Copiar o texto".';
       return;
     }
     window.print();
   }catch(e){ msg.textContent='Não consegui abrir a impressão neste navegador. Use "Copiar o texto".'; }};
 if($('b-copy'))$('b-copy').onclick=function(){
   var alvo=document.querySelector('.tela'), txt=(alvo?alvo.innerText:'').replace(/\n{3,}/g,'\n\n');
   var msg=document.getElementById('mailmsg');
   if(navigator.clipboard&&navigator.clipboard.writeText){
     navigator.clipboard.writeText(txt).then(function(){msg.textContent='Autorretrato copiado — é só colar onde você quiser guardar.';},
       function(){msg.textContent='O navegador bloqueou a cópia. Selecione o texto e copie na mão.';});
   } else { msg.textContent='Este navegador não permite copiar automaticamente. Selecione o texto e copie na mão.'; }};
 if($('b-mail'))$('b-mail').onclick=function(){
   trackEvent('portrait_email_requested');
   document.getElementById('mailmsg').textContent='Abre a sua ficha e toca em "Receber por e-mail" — de lá eu mando agora mesmo.';};
 if($('play'))$('play').onclick=function(){var t=setInterval(function(){S.video=Math.min(100,S.video+4);salvar();
   if(S.video>=100||S.video===76){clearInterval(t);render();}else{var b=app.querySelector('.pl-bar i');if(b)b.style.width=S.video+'%';
     var e=app.querySelector('.pl-t');if(e)e.textContent=Math.round(S.video*7.2/60)+':'+String(Math.round(S.video*7.2)%60).padStart(2,'0')+' / 12:00';}},110);};
 salvar();
}
document.getElementById('reset').onclick=function(){try{localStorage.removeItem('antessala3');localStorage.removeItem(FILA);localStorage.removeItem(PID);localStorage.removeItem(ATRIB);localStorage.removeItem(VISTO);}catch(e){}
 S={etapa:0,sub:0,nome:'',data:'',hora:'',horaIncerta:false,cidade:null,email:'',tel:'',resp:{},video:0,okRelatorio:false,okNovidades:false,maior:false,ofertaVista:false,playerId:'',reflexao:'',utm:null,genero:''};location.reload();};
/* =====================================================================
   REDE DE SEGURANÇA
   Se algo quebrar — construtor de site que remove atributo, armazenamento
   bloqueado, script de terceiro que derruba o nosso — o jogador não pode
   ficar diante de uma tela morta sem saber o que houve.
   ===================================================================== */
function iniciarJogo(){
  try{ trackUmaVez('identity_started'); }catch(e){}
  try{ instrRoda('abertura', function(){ ir(1,0); }); }
  catch(e){ try{ ir(1,0); }catch(e2){} }
}
/* Delegação: pega o clique venha de onde vier, inclusive de HTML recriado. */
document.addEventListener('click', function(ev){
  var t=ev.target;
  while(t && t!==document){
    if(t.id==='b-iniciar'){ ev.preventDefault(); iniciarJogo(); return; }
    t=t.parentNode;
  }
}, true);

function socorro(msg){
  try{
    if(document.getElementById('socorro')) return;
    var d=document.createElement('div'); d.id='socorro';
    d.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#7A2E1C;color:#fff;'+
      'font:12px/1.5 monospace;padding:11px 14px;text-align:left';
    d.textContent='Não consegui iniciar aqui. Motivo: '+msg;
    document.body.appendChild(d);
  }catch(e){}
}
try{
  window.addEventListener('error', function(ev){
    if(!app || !app.innerHTML || app.innerHTML.length<40) socorro((ev && ev.message)||'erro desconhecido');
  });
}catch(e){}

/* ?diag=1 — relatório do ambiente, para depurar publicação em site de terceiro */
try{
 if(location.search.indexOf('diag=1')>=0){
  var linhas=[];
  function t(k,v){linhas.push(k+': '+v);}
  t('versão','/*__VERSAO__*/');
  t('enquadrado', EMBUTIDO?'SIM — dentro de um quadro (altura fixa 640)':'não');
  t('altura da janela', window.innerHeight+'px');
  t('--vph', getComputedStyle(document.documentElement).getPropertyValue('--vph'));
  var okLS='sim'; try{localStorage.setItem('__t','1');localStorage.removeItem('__t');}catch(e){okLS='BLOQUEADO — '+e.name;}
  t('armazenamento', okLS);
  t('motor de oráculos', (window.Oraculos?'carregado':'AUSENTE'));
  t('narrativa', (window.Narrativa?'carregada':'AUSENTE'));
  t('municípios', (window.CIDADES&&window.CIDADES.c?window.CIDADES.c.length+' carregados':'AUSENTES'));
  t('astronomia', (window.Astronomy?'carregada':'AUSENTE'));
  t('elemento #app', (document.getElementById('app')?'existe':'AUSENTE'));
  t('botão iniciar', (document.getElementById('b-iniciar')?'existe':'ausente (normal fora da etapa 0)'));
  t('fontes', (document.fonts&&document.fonts.status)||'?');
  var d=document.createElement('pre');
  d.style.cssText='position:fixed;inset:0;z-index:9998;background:#0A0E15;color:#DFA943;'+
    'font:12px/1.7 monospace;padding:20px;margin:0;overflow:auto;white-space:pre-wrap';
  d.textContent='DIAGNÓSTICO — O Jogador Consciente\n\n'+linhas.join('\n')+
    '\n\nManda um print desta tela.\n(tire ?diag=1 do endereço para voltar ao jogo)';
  document.body.appendChild(d);
 }
}catch(e){}

trackUmaVez('app_started',{referrer_host:(atribuicao&&atribuicao.first_referrer)||''});
render();
})();
